import { useEffect, useState } from 'react';
import { collection, deleteDoc, doc, getDocs, orderBy, query } from 'firebase/firestore';
import { deleteObject, ref } from 'firebase/storage';
import { db, storage } from '../firebase.js';
import Layout from '../components/Layout.jsx';
import FileUploader from '../components/FileUploader.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function Files() {
  const { user, isAdmin } = useAuth();
  const [files, setFiles] = useState([]);
  const load = async () => {
    const s = await getDocs(query(collection(db, 'files'), orderBy('createdAt', 'desc')));
    setFiles(s.docs.map((d) => ({ id: d.id, ...d.data() })));
  };
  useEffect(() => { load(); }, []);
  const remove = async (f) => {
    if (!confirm(`Delete ${f.name}?`)) return;
    try { if (f.path) await deleteObject(ref(storage, f.path)); } catch { /* ignore */ }
    await deleteDoc(doc(db, 'files', f.id));
    load();
  };
  const previewable = (n) => (n || '').toLowerCase().endsWith('.pdf') || /\.(png|jpe?g)$/i.test(n || '');
  return (
    <Layout>
      <h2>Files</h2>
      <FileUploader onDone={load} />
      {files.map((f) => (
        <div key={f.id} className="card">
          <strong>{f.name}</strong>
          <div className="meta">{f.type} — {Math.round((f.size || 0) / 1024)} KB — Uploaded by {f.uploadedByName} — {f.description}</div>
          <div className="row" style={{ marginTop: 6 }}>
            {previewable(f.name) && <a className="btn small" href={f.url} target="_blank" rel="noreferrer">Preview</a>}
            <a className="btn small" href={f.url} target="_blank" rel="noreferrer">Download</a>
            {(isAdmin || f.uploadedBy === user?.uid) && <button className="btn small danger" onClick={() => remove(f)}>Delete</button>}
          </div>
        </div>
      ))}
    </Layout>
  );
}
