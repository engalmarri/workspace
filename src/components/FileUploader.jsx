import { useState } from 'react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, storage } from '../firebase.js';
import { useAuth } from '../context/AuthContext.jsx';
import { ALLOWED_FILE_TYPES, MAX_FILE_MB } from '../utils/constants.js';
import { logActivity } from '../services/helpers.js';

export default function FileUploader({ pageId, onDone }) {
  const { user, profile } = useAuth();
  const [desc, setDesc] = useState('');
  const [progress, setProgress] = useState(0);
  const [msg, setMsg] = useState('');

  const validType = (name) => ALLOWED_FILE_TYPES.some((e) => name.toLowerCase().endsWith(e));

  const upload = (file) => {
    setMsg('');
    if (!validType(file.name)) { setMsg('File type not allowed.'); return; }
    if (file.size > MAX_FILE_MB * 1024 * 1024) { setMsg(`Max size is ${MAX_FILE_MB} MB.`); return; }
    const path = `workspace/${pageId || 'general'}/${Date.now()}_${file.name}`;
    const task = uploadBytesResumable(ref(storage, path), file);
    task.on('state_changed',
      (s) => setProgress(Math.round((s.bytesTransferred / s.totalBytes) * 100)),
      (e) => setMsg('Upload failed: ' + e.message),
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        await addDoc(collection(db, 'files'), {
          pageId: pageId || '', name: file.name, url, path,
          type: file.type || 'file', size: file.size, description: desc,
          uploadedBy: user.uid, uploadedByName: profile?.displayName || profile?.email,
          createdAt: serverTimestamp()
        });
        await logActivity({ userId: user.uid, userName: profile?.displayName, action: 'uploaded file', targetType: 'file', targetTitle: file.name });
        setDesc(''); setProgress(0); setMsg('Uploaded.');
        onDone && onDone();
      });
  };

  return (
    <div className="card">
      <h4>Engineering Data / File Upload</h4>
      <label>Description</label>
      <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Reservoir simulation results for field X" />
      <label>File (max {MAX_FILE_MB} MB)</label>
      <input type="file" onChange={(e) => e.target.files[0] && upload(e.target.files[0])} />
      {progress > 0 && <div className="meta">Uploading... {progress}%</div>}
      {msg && <div className="meta">{msg}</div>}
    </div>
  );
}
