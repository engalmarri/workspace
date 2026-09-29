import { useEffect, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, getDocs, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import { db, storage } from '../firebase.js';
import { useAuth } from '../context/AuthContext.jsx';
import { logActivity, notifyUser } from '../services/helpers.js';
import Icon from './icons.jsx';

const MAX_MB = 20;

function fmtDate(ts) {
  try {
    const d = ts?.toDate ? ts.toDate() : null;
    return d ? d.toLocaleString() : '—';
  } catch { return '—'; }
}

function fmtSize(b) {
  if (!b && b !== 0) return '';
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${Math.round(b / 1024)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

// Per-page Word workflow:
// - Official .docx versions (admin uploads, v1, v2...). Originals are never
//   overwritten; every version stays downloadable; the newest is highlighted.
// - Member modified copies appear beside the official with a SUGGESTED badge.
//   Accept promotes the copy to a new official version; Reject keeps history.
export default function PageWordFiles({ pageId, pageTitle }) {
  const { user, profile, isAdmin } = useAuth();
  const [items, setItems] = useState([]);
  const [note, setNote] = useState('');
  const [progress, setProgress] = useState(0);
  const [msg, setMsg] = useState('');

  const load = async () => {
    const s = await getDocs(query(collection(db, 'pageDocs'), where('pageId', '==', pageId)));
    const list = s.docs.map((d) => ({ id: d.id, ...d.data() }));
    list.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
    setItems(list);
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [pageId]);

  const officials = items.filter((i) => i.kind === 'official').sort((a, b) => (b.version || 0) - (a.version || 0));
  const suggestions = items.filter((i) => i.kind === 'suggestion');
  const latest = officials[0];
  const older = officials.slice(1);

  const uploadFile = (file, kind) => {
    setMsg('');
    if (!/\.docx$/i.test(file.name)) { setMsg('Only .docx files are accepted here.'); return; }
    if (file.size > MAX_MB * 1024 * 1024) { setMsg(`Max file size is ${MAX_MB} MB.`); return; }
    const path = `workspace/${pageId}/pagedocs/${Date.now()}_${file.name}`;
    const task = uploadBytesResumable(ref(storage, path), file);
    task.on('state_changed',
      (s) => setProgress(Math.round((s.bytesTransferred / s.totalBytes) * 100)),
      (e) => { setProgress(0); setMsg('Upload failed: ' + e.message); },
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        const rec = {
          pageId, name: file.name, url, path, size: file.size,
          kind, version: kind === 'official' ? (latest?.version || 0) + 1 : null,
          status: kind === 'official' ? 'official' : 'pending',
          note: note || '',
          uploadedBy: user.uid, uploadedByName: profile?.displayName || profile?.email,
          createdAt: serverTimestamp()
        };
        const r = await addDoc(collection(db, 'pageDocs'), rec);
        await logActivity({
          userId: user.uid, userName: profile?.displayName,
          action: kind === 'official' ? 'uploaded official Word file' : 'uploaded modified Word copy',
          targetType: 'pagedoc', targetId: r.id, targetTitle: `${pageTitle} — ${file.name}`
        });
        if (kind === 'suggestion') {
          const admins = await getDocs(query(collection(db, 'users'), where('role', '==', 'admin')));
          for (const a of admins.docs) {
            await notifyUser({ userId: a.id, title: `${profile?.displayName} uploaded a modified Word copy for "${pageTitle}"`, body: note || file.name, link: `/pages/${pageId}` });
          }
        }
        setNote(''); setProgress(0); setMsg('Uploaded.');
        load();
      });
  };

  const acceptSuggestion = async (s) => {
    // Promote the copy: new official version pointing at the same file.
    await addDoc(collection(db, 'pageDocs'), {
      pageId, name: s.name, url: s.url, path: s.path, size: s.size,
      kind: 'official', version: (latest?.version || 0) + 1, status: 'official',
      note: `Accepted from ${s.uploadedByName}${s.note ? ' — ' + s.note : ''}`,
      uploadedBy: user.uid, uploadedByName: profile?.displayName,
      createdAt: serverTimestamp()
    });
    await updateDoc(doc(db, 'pageDocs', s.id), { status: 'accepted' });
    await logActivity({ userId: user.uid, userName: profile?.displayName, action: 'accepted Word suggestion', targetType: 'pagedoc', targetId: s.id, targetTitle: `${pageTitle} — ${s.name}` });
    await notifyUser({ userId: s.uploadedBy, title: `Your modified Word copy was accepted`, body: pageTitle || '', link: `/pages/${pageId}` });
    load();
  };

  const rejectSuggestion = async (s) => {
    await updateDoc(doc(db, 'pageDocs', s.id), { status: 'rejected' });
    await logActivity({ userId: user.uid, userName: profile?.displayName, action: 'rejected Word suggestion', targetType: 'pagedoc', targetId: s.id, targetTitle: `${pageTitle} — ${s.name}` });
    await notifyUser({ userId: s.uploadedBy, title: `Your modified Word copy was rejected`, body: pageTitle || '', link: `/pages/${pageId}` });
    load();
  };

  const canDelete = (it) => isAdmin || (it.uploadedBy === user?.uid && it.status === 'pending');

  const removeRecord = async (it) => {
    if (!confirm(`Delete record "${it.name}"? The history entry will be removed.`)) return;
    // Delete the stored file only if no other record points at it (accepted copies share the path).
    const refs = items.filter((x) => x.path === it.path && x.id !== it.id);
    try { if (it.path && refs.length === 0) await deleteObject(ref(storage, it.path)); } catch { /* already gone */ }
    await deleteDoc(doc(db, 'pageDocs', it.id));
    await logActivity({ userId: user.uid, userName: profile?.displayName, action: 'deleted Word file record', targetType: 'pagedoc', targetId: it.id, targetTitle: `${pageTitle} — ${it.name}` });
    load();
  };

  const dl = (it) => (
    <a className="btn small" href={it.url} download={it.name} target="_blank" rel="noreferrer" title="Download .docx">
      <Icon name="download" /> Download
    </a>
  );

  const statusBadge = (s) => {
    const map = { pending: ['#fef3c7', '#92400e', 'SUGGESTED — pending'], accepted: ['#dcfce7', '#15803d', 'ACCEPTED'], rejected: ['#f3f4f6', '#6b7280', 'REJECTED'] };
    const [bg, fg, label] = map[s] || map.pending;
    return <span style={{ background: bg, color: fg, fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 10 }}>{label}</span>;
  };

  return (
    <div className="card">
      <h3>Page Word Files <span className="meta">— official version + member modified copies</span></h3>

      {!latest && <div className="meta">No official Word file yet. The supervisor can upload the prepared .docx below.</div>}

      {latest && (
        <div className="card" style={{ border: '2px solid #15803d', background: '#f0fdf4' }}>
          <div className="row">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icon name="word" /><strong>{latest.name}</strong></span>
            <span style={{ background: '#15803d', color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 10 }}>LATEST — v{latest.version}</span>
          </div>
          <div className="meta">{fmtSize(latest.size)} — {fmtDate(latest.createdAt)} — by {latest.uploadedByName}{latest.note ? ` — ${latest.note}` : ''}</div>
          <div className="row" style={{ marginTop: 6 }}>{dl(latest)}</div>
        </div>
      )}

      {older.length > 0 && (
        <details>
          <summary className="meta" style={{ cursor: 'pointer' }}>Previous official versions ({older.length}) — kept for rollback</summary>
          {older.map((o) => (
            <div key={o.id} className="card" style={{ marginTop: 8 }}>
              <div className="row">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icon name="word" /><strong>v{o.version} — {o.name}</strong></span>
              </div>
              <div className="meta">{fmtSize(o.size)} — {fmtDate(o.createdAt)} — by {o.uploadedByName}{o.note ? ` — ${o.note}` : ''}</div>
              <div className="row" style={{ marginTop: 6 }}>{dl(o)}</div>
            </div>
          ))}
        </details>
      )}

      <h4 style={{ marginTop: 14 }}>Member modified copies {suggestions.length > 0 && `(${suggestions.length})`}</h4>
      {suggestions.length === 0 && <div className="meta">No modified copies yet.</div>}
      {suggestions.map((s) => (
        <div key={s.id} className="card" style={{ borderLeft: '4px solid #f0c36d' }}>
          <div className="row">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icon name="word" /><strong>{s.name}</strong></span>
            {statusBadge(s.status)}
          </div>
          <div className="meta">{fmtSize(s.size)} — {fmtDate(s.createdAt)} — by {s.uploadedByName}{s.note ? ` — change note: ${s.note}` : ''}</div>
          <div className="row" style={{ marginTop: 6 }}>
            {dl(s)}
            {isAdmin && s.status === 'pending' && <><button className="btn small primary" onClick={() => acceptSuggestion(s)}><Icon name="check" /> Accept as new official</button><button className="btn small danger" onClick={() => rejectSuggestion(s)}><Icon name="x" /> Reject</button></>}
            {canDelete(s) && !isAdmin && <button className="btn small danger" onClick={() => removeRecord(s)}><Icon name="trash" /> Delete</button>}
            {isAdmin && <button className="btn small danger" onClick={() => removeRecord(s)}><Icon name="trash" /> Delete record</button>}
          </div>
        </div>
      ))}

      <div className="row" style={{ marginTop: 12, alignItems: 'flex-end' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <label>{isAdmin ? 'Upload official version (.docx)' : 'Upload your modified copy (.docx)'}</label>
          <input type="file" accept=".docx" onChange={(e) => { if (e.target.files[0]) uploadFile(e.target.files[0], isAdmin ? 'official' : 'suggestion'); e.target.value = ''; }} />
        </div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <label>{isAdmin ? 'Version note (optional)' : 'What did you change? (shown beside your copy)'}</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={isAdmin ? 'e.g. final formatting' : 'e.g. fixed reservoir pressure to 3500 psi'} />
        </div>
      </div>
      {progress > 0 && <div className="meta">Uploading... {progress}%</div>}
      {msg && <div className="meta">{msg}</div>}
    </div>
  );
}
