import { useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase.js';
import { useAuth } from '../context/AuthContext.jsx';
import { youtubeEmbedUrl } from '../utils/diff.js';
import { logActivity } from '../services/helpers.js';

export default function VideoLinks({ pageId, items, onChanged }) {
  const { user, profile } = useAuth();
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [desc, setDesc] = useState('');

  const add = async () => {
    if (!title || !url) return;
    await addDoc(collection(db, 'components'), {
      pageId: pageId || '', type: 'video',
      content: { title, url, description: desc },
      createdBy: user.uid, createdByName: profile?.displayName || profile?.email,
      createdAt: serverTimestamp(), updatedAt: serverTimestamp()
    });
    await logActivity({ userId: user.uid, userName: profile?.displayName, action: 'added video/link', targetType: 'video', targetId: pageId, targetTitle: title });
    setTitle(''); setUrl(''); setDesc(''); onChanged && onChanged();
  };

  return (
    <div className="card">
      <h4>Videos &amp; Links</h4>
      <label>Title</label><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Well Logging Introduction" />
      <label>URL</label><input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://youtube.com/..." />
      <label>Description</label><input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Short description" />
      <div style={{ marginTop: 8 }}><button className="btn primary" onClick={add}>Add</button></div>
      <div style={{ marginTop: 12 }}>
        {(items || []).map((c) => {
          const embed = youtubeEmbedUrl(c.content?.url);
          return (
            <div key={c.id} className="card">
              <strong>{c.content?.title}</strong>
              <div className="meta">{c.content?.description}</div>
              {embed
                ? <div style={{ marginTop: 8 }}><iframe width="100%" height="315" src={embed} title={c.content?.title} frameBorder="0" allowFullScreen /></div>
                : <div style={{ marginTop: 8 }}><a href={c.content?.url} target="_blank" rel="noreferrer">Open Website</a></div>}
              <div className="meta">Added by: {c.createdByName}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
