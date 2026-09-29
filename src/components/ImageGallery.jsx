import { useState } from 'react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, storage } from '../firebase.js';
import { useAuth } from '../context/AuthContext.jsx';
import { logActivity } from '../services/helpers.js';

export default function ImageGallery({ pageId, images, onChanged }) {
  const { user, profile } = useAuth();
  const [desc, setDesc] = useState('');
  const [progress, setProgress] = useState(0);
  const [zoom, setZoom] = useState(null);

  const upload = (file) => {
    if (!file.type.startsWith('image/')) return;
    const path = `workspace/${pageId || 'general'}/img_${Date.now()}_${file.name}`;
    const task = uploadBytesResumable(ref(storage, path), file);
    task.on('state_changed',
      (s) => setProgress(Math.round((s.bytesTransferred / s.totalBytes) * 100)),
      () => setProgress(0),
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        await addDoc(collection(db, 'components'), {
          pageId: pageId || '', type: 'image', content: { url, description: desc },
          createdBy: user.uid, createdByName: profile?.displayName || profile?.email,
          createdAt: serverTimestamp(), updatedAt: serverTimestamp()
        });
        await logActivity({ userId: user.uid, userName: profile?.displayName, action: 'added image', targetType: 'image', targetId: pageId, targetTitle: desc });
        setDesc(''); setProgress(0); onChanged && onChanged();
      });
  };

  return (
    <div className="card">
      <h4>Images / Gallery</h4>
      <label>Description</label>
      <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Reservoir simulation result showing pressure distribution" />
      <label>Upload image</label>
      <input type="file" accept="image/*" onChange={(e) => e.target.files[0] && upload(e.target.files[0])} />
      {progress > 0 && <div className="meta">Uploading... {progress}%</div>}
      <div className="gallery" style={{ marginTop: 12 }}>
        {(images || []).map((c) => (
          <div key={c.id}>
            <img src={c.content?.url} alt={c.content?.description || ''} onClick={() => setZoom(c.content?.url)} />
            <div className="meta">{c.content?.description}</div>
            <div className="meta">Added by: {c.createdByName}</div>
          </div>
        ))}
      </div>
      {zoom && <div className="lightbox" onClick={() => setZoom(null)}><img src={zoom} alt="" /></div>}
    </div>
  );
}
