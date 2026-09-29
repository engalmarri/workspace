import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { deleteObject, ref } from 'firebase/storage';
import { db, storage } from '../firebase.js';
import Layout from '../components/Layout.jsx';
import DocEditor from '../components/DocEditor.jsx';
import DiffViewer from '../components/DiffViewer.jsx';
import ImageGallery from '../components/ImageGallery.jsx';
import VideoLinks from '../components/VideoLinks.jsx';
import FileUploader from '../components/FileUploader.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { logActivity, notifyUser, touchPage } from '../services/helpers.js';
import { exportToDocx, exportToPdf } from '../utils/exportDoc.js';

export default function PageView() {
  const { id } = useParams();
  const { user, profile, isAdmin } = useAuth();
  const [page, setPage] = useState(null);
  const [docComp, setDocComp] = useState(null);
  const [html, setHtml] = useState('');
  const [saveState, setSaveState] = useState('Saved');
  const [images, setImages] = useState([]);
  const [videos, setVideos] = useState([]);
  const [files, setFiles] = useState([]);
  const [revisions, setRevisions] = useState([]);
  const [suggestMode, setSuggestMode] = useState(false);
  const [draft, setDraft] = useState('');
  const timer = useRef(null);

  const load = async () => {
    const p = await getDoc(doc(db, 'pages', id));
    if (p.exists()) setPage({ id: p.id, ...p.data() });
    const cs = await getDocs(query(collection(db, 'components'), where('pageId', '==', id)));
    const list = cs.docs.map((d) => ({ id: d.id, ...d.data() }));
    const d = list.find((c) => c.type === 'doc');
    if (d) { setDocComp(d); setHtml(d.content?.html || ''); }
    setImages(list.filter((c) => c.type === 'image'));
    setVideos(list.filter((c) => c.type === 'video'));
    const fs = await getDocs(query(collection(db, 'files'), where('pageId', '==', id)));
    setFiles(fs.docs.map((f) => ({ id: f.id, ...f.data() })));
    if (d) {
      const rs = await getDocs(query(collection(db, 'revisions'), where('componentId', '==', d.id)));
      setRevisions(rs.docs.map((r) => ({ id: r.id, ...r.data() })));
    }
  };
  useEffect(() => { load(); }, [id]);

  const ensureDoc = async () => {
    if (docComp) return docComp;
    if (!isAdmin) return null;
    const r = await addDoc(collection(db, 'components'), {
      pageId: id, type: 'doc', content: { html: '' },
      createdBy: user.uid, createdByName: profile?.displayName,
      createdAt: serverTimestamp(), updatedAt: serverTimestamp()
    });
    const c = { id: r.id, pageId: id, type: 'doc', content: { html: '' }, createdByName: profile?.displayName };
    setDocComp(c); return c;
  };

  // Auto-save (admin edits official version directly; members create suggestions instead)
  const onEdit = async (v) => {
    setHtml(v);
    if (!isAdmin) return; // members must use Suggest
    setSaveState('Saving...');
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const c = await ensureDoc();
      if (!c) return;
      await updateDoc(doc(db, 'components', c.id), { content: { html: v }, updatedAt: serverTimestamp() });
      await touchPage(id);
      await logActivity({ userId: user.uid, userName: profile?.displayName, action: 'edited page', targetType: 'page', targetId: id, targetTitle: page?.title });
      setSaveState('Saved');
    }, 1200);
  };

  const submitSuggestion = async () => {
    const c = docComp || await ensureDoc();
    if (!c && !docComp) { alert('No official document yet — ask the supervisor to create it first.'); return; }
    const target = docComp || c;
    await addDoc(collection(db, 'revisions'), {
      componentId: target.id, pageId: id,
      originalContent: target.content?.html || html,
      proposedContent: draft || html,
      createdBy: user.uid, createdByName: profile?.displayName,
      status: 'pending', createdAt: serverTimestamp()
    });
    await logActivity({ userId: user.uid, userName: profile?.displayName, action: 'suggested edit', targetType: 'revision', targetId: id, targetTitle: page?.title });
    // notify all admins (simple: notification per admin user doc)
    const admins = await getDocs(query(collection(db, 'users'), where('role', '==', 'admin')));
    for (const a of admins.docs) {
      await notifyUser({ userId: a.id, title: `${profile?.displayName} suggested an edit to "${page?.title}"`, body: '', link: `/pages/${id}` });
    }
    setSuggestMode(false); setDraft(''); load();
  };

  const review = async (rev, decision) => {
    await updateDoc(doc(db, 'revisions', rev.id), {
      status: decision, reviewedBy: user.uid, reviewedByName: profile?.displayName, reviewedAt: serverTimestamp()
    });
    if (decision === 'accepted') {
      await updateDoc(doc(db, 'components', rev.componentId), { content: { html: rev.proposedContent }, updatedAt: serverTimestamp() });
      setHtml(rev.proposedContent);
      await touchPage(id);
    }
    await logActivity({ userId: user.uid, userName: profile?.displayName, action: `${decision} revision`, targetType: 'revision', targetId: id, targetTitle: page?.title });
    await notifyUser({ userId: rev.createdBy, title: `Your revision was ${decision}`, body: page?.title || '', link: `/pages/${id}` });
    load();
  };

  const removeFile = async (f) => {
    if (!confirm(`Delete ${f.name}?`)) return;
    try { if (f.path) await deleteObject(ref(storage, f.path)); } catch { /* ignore */ }
    await deleteDoc(doc(db, 'files', f.id));
    await logActivity({ userId: user.uid, userName: profile?.displayName, action: 'deleted file', targetType: 'file', targetId: id, targetTitle: f.name });
    load();
  };
  const canDeleteFile = (f) => isAdmin || f.uploadedBy === user?.uid;

  if (!page) return <Layout><div>Loading...</div></Layout>;
  return (
    <Layout>
      <h2>Page: {page.title}</h2>
      <div className="meta">Status: <span className={saveState === 'Saved' ? 'status-saved' : 'status-saving'}>{isAdmin ? saveState : 'Members propose edits via Suggest'}</span></div>

      <div className="card" id="export-root">
        <h3>Document {docComp ? <span className="meta">— Written by {docComp.createdByName}</span> : <span className="meta">— no document yet</span>}</h3>
        {isAdmin
          ? <DocEditor value={html} onChange={onEdit} editable />
          : <DocEditor value={html} editable={false} />}
        {!isAdmin && !suggestMode && <button className="btn primary" onClick={() => { setDraft(html); setSuggestMode(true); }}>Suggest an edit</button>}
        {!isAdmin && suggestMode && (
          <div style={{ marginTop: 10 }}>
            <div className="meta">Edit a copy below — the original stays unchanged until the supervisor accepts.</div>
            <DocEditor value={draft} onChange={setDraft} editable />
            <div className="row" style={{ marginTop: 8 }}>
              <button className="btn primary" onClick={submitSuggestion}>Submit suggestion</button>
              <button className="btn" onClick={() => setSuggestMode(false)}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      <div className="row">
        <button className="btn" onClick={() => exportToPdf(page.title, html, `${page.title}.pdf`)}>Export PDF</button>
        <button className="btn" onClick={() => exportToDocx([{ title: page.title, html }], `${page.title}.docx`)}>Export Word (.docx)</button>
      </div>

      <h3>Suggested Revisions {revisions.filter((r) => r.status === 'pending').length > 0 && `(${revisions.filter((r) => r.status === 'pending').length} pending)`}</h3>
      {revisions.map((r) => (
        <div key={r.id} className="card">
          <div className="meta">{r.createdByName} suggested an edit — status: <strong>{r.status}</strong></div>
          <DiffViewer original={r.originalContent} suggested={r.proposedContent} />
          {isAdmin && r.status === 'pending' && (
            <div className="row">
              <button className="btn primary" onClick={() => review(r, 'accepted')}>Accept</button>
              <button className="btn danger" onClick={() => review(r, 'rejected')}>Reject</button>
            </div>
          )}
        </div>
      ))}

      <h3>Revision History</h3>
      <div className="card">
        <table className="grid">
          <thead><tr><th>User</th><th>Action</th><th>Status</th></tr></thead>
          <tbody>
            {revisions.map((r) => (
              <tr key={r.id}><td>{r.createdByName}</td><td>Suggested edit{isAdmin && r.reviewedByName ? ` — reviewed by ${r.reviewedByName}` : ''}</td><td>{r.status}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <ImageGallery pageId={id} images={images} onChanged={load} />
      <VideoLinks pageId={id} items={videos} onChanged={load} />
      <FileUploader pageId={id} onDone={load} />
      <div className="card">
        <h4>Files</h4>
        {files.map((f) => (
          <div key={f.id} className="meta">{f.name} ({Math.round((f.size || 0) / 1024)} KB) — Uploaded by {f.uploadedByName} — <a href={f.url} target="_blank" rel="noreferrer">Download</a>
            {canDeleteFile(f) && <> — <button className="btn small danger" onClick={() => removeFile(f)}>Delete</button></>}
          </div>
        ))}
      </div>
    </Layout>
  );
}
