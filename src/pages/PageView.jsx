import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { deleteObject, ref } from 'firebase/storage';
import mammoth from 'mammoth';
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

const draftKey = (pageId) => `gws-draft-${pageId}`;

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
  const [notice, setNotice] = useState('');
  const [importing, setImporting] = useState(false);
  const timer = useRef(null);
  const docIdRef = useRef(null);      // single source of truth for the doc id (no stale state)
  const creatingRef = useRef(null);   // in-flight creation promise (prevents duplicate docs)
  const htmlRef = useRef('');
  const fileInputRef = useRef(null);

  const load = async () => {
    const p = await getDoc(doc(db, 'pages', id));
    if (p.exists()) setPage({ id: p.id, ...p.data() });
    const cs = await getDocs(query(collection(db, 'components'), where('pageId', '==', id)));
    const list = cs.docs.map((d) => ({ id: d.id, ...d.data() }));
    const docs = list.filter((c) => c.type === 'doc');
    const d = docs[0];
    if (d) {
      docIdRef.current = d.id;
      setDocComp(d);
      let official = d.content?.html || '';
      // Safety net: restore unsaved browser backup if the official copy is empty
      try {
        const bak = JSON.parse(localStorage.getItem(draftKey(id)) || 'null');
        if ((!official || !official.replace(/<[^>]*>/g, '').trim()) && bak && bak.html && bak.html.replace(/<[^>]*>/g, '').trim()) {
          official = bak.html;
          setNotice('Recovered unsaved changes from this browser. Press Save now to keep them.');
        }
      } catch { /* ignore corrupt backup */ }
      htmlRef.current = official;
      setHtml(official);
    }
    setImages(list.filter((c) => c.type === 'image'));
    setVideos(list.filter((c) => c.type === 'video'));
    const fs = await getDocs(query(collection(db, 'files'), where('pageId', '==', id)));
    setFiles(fs.docs.map((f) => ({ id: f.id, ...f.data() })));
    if (d) {
      const rs = await getDocs(query(collection(db, 'revisions'), where('componentId', '==', d.id)));
      setRevisions(rs.docs.map((r) => ({ id: r.id, ...r.data() })));
    }
  };
  useEffect(() => {
    docIdRef.current = null;
    creatingRef.current = null;
    setNotice('');
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const ensureDoc = async () => {
    if (docIdRef.current) return docIdRef.current;
    if (!isAdmin) return null;
    if (!creatingRef.current) {
      creatingRef.current = addDoc(collection(db, 'components'), {
        pageId: id, type: 'doc', content: { html: htmlRef.current || '' },
        createdBy: user.uid, createdByName: profile?.displayName,
        createdAt: serverTimestamp(), updatedAt: serverTimestamp()
      }).then((r) => {
        docIdRef.current = r.id;
        setDocComp({ id: r.id, pageId: id, type: 'doc', content: { html: htmlRef.current || '' }, createdByName: profile?.displayName });
        creatingRef.current = null;
        return r.id;
      }).catch((e) => { creatingRef.current = null; throw e; });
    }
    return creatingRef.current;
  };

  const persist = async (v) => {
    const docId = await ensureDoc();
    if (!docId) return false;
    await updateDoc(doc(db, 'components', docId), { content: { html: v }, updatedAt: serverTimestamp() });
    await touchPage(id);
    await logActivity({ userId: user.uid, userName: profile?.displayName, action: 'edited page', targetType: 'page', targetId: id, targetTitle: page?.title });
    try { localStorage.removeItem(draftKey(id)); } catch { /* ignore */ }
    return true;
  };

  // Auto-save (admin edits official version directly; members create suggestions instead)
  const onEdit = async (v) => {
    htmlRef.current = v;
    setHtml(v);
    try { localStorage.setItem(draftKey(id), JSON.stringify({ html: v, at: Date.now() })); } catch { /* ignore */ }
    if (!isAdmin) return; // members must use Suggest
    setSaveState('Saving...');
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        await persist(v);
        setSaveState('Saved');
      } catch { setSaveState('Save failed — check connection and press Save now'); }
    }, 1200);
  };

  const saveNow = async () => {
    if (!isAdmin) return;
    clearTimeout(timer.current);
    setSaveState('Saving...');
    try {
      await persist(htmlRef.current);
      setSaveState('Saved');
      setNotice('');
    } catch { setSaveState('Save failed — check connection and press Save now'); }
  };

  // Import a .docx file prepared offline; keeps headings/bold/lists/tables/images
  const importWord = async (file) => {
    if (!file) return;
    setImporting(true);
    try {
      const buf = await file.arrayBuffer();
      const { value } = await mammoth.convertToHtml({ arrayBuffer: buf });
      if (isAdmin) {
        htmlRef.current = value;
        setHtml(value);
        try { localStorage.setItem(draftKey(id), JSON.stringify({ html: value, at: Date.now() })); } catch { /* ignore */ }
        await persist(value);
        setSaveState('Saved');
        setNotice('Word file imported and saved.');
        await logActivity({ userId: user.uid, userName: profile?.displayName, action: 'imported Word file', targetType: 'page', targetId: id, targetTitle: file.name });
      } else {
        setDraft(value);
        setSuggestMode(true);
        setNotice('Word file loaded into your suggestion draft — review then Submit.');
      }
    } catch { setNotice('Could not read this Word file. Try saving it as .docx and retry.'); }
    setImporting(false);
  };

  const submitSuggestion = async () => {
    const c = docComp || docIdRef.current;
    if (!c) { alert('No official document yet — ask the supervisor to create it first.'); return; }
    const targetId = typeof c === 'string' ? c : c.id;
    const originalContent = (typeof c === 'object' && c.content?.html) || htmlRef.current;
    await addDoc(collection(db, 'revisions'), {
      componentId: targetId, pageId: id,
      originalContent,
      proposedContent: draft || htmlRef.current,
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
      htmlRef.current = rev.proposedContent;
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
      {notice && <div className="card" style={{ borderColor: '#f0c36d', background: '#fefce8' }}>{notice}</div>}

      <div className="card">
        <div className="row" style={{ marginBottom: 10 }}>
          {isAdmin && <button className="btn primary" onClick={saveNow}>Save now</button>}
          <button className="btn" disabled={importing} onClick={() => fileInputRef.current && fileInputRef.current.click()}>
            {importing ? 'Importing...' : 'Import Word (.docx)'}
          </button>
          <input ref={fileInputRef} type="file" accept=".docx" style={{ display: 'none' }}
            onChange={(e) => { if (e.target.files[0]) importWord(e.target.files[0]); e.target.value = ''; }} />
        </div>
        <h3>Document {docComp ? <span className="meta">— Written by {docComp.createdByName}</span> : <span className="meta">— no document yet</span>}</h3>
        {isAdmin
          ? <DocEditor value={html} onChange={onEdit} editable />
          : <DocEditor value={html} editable={false} />}
        {!isAdmin && !suggestMode && <button className="btn primary" onClick={() => { setDraft(htmlRef.current); setSuggestMode(true); }}>Suggest an edit</button>}
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
        <button className="btn" onClick={() => exportToPdf(page.title, htmlRef.current, `${page.title}.pdf`)}>Export PDF</button>
        <button className="btn" onClick={() => exportToDocx([{ title: page.title, html: htmlRef.current }], `${page.title}.docx`)}>Export Word (.docx)</button>
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
