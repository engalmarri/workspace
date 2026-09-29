import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase.js';
import Layout from '../components/Layout.jsx';
import { youtubeEmbedUrl } from '../utils/diff.js';

function useComponents(type) {
  const [items, setItems] = useState([]);
  useEffect(() => {
    (async () => {
      const s = await getDocs(collection(db, 'components'));
      setItems(s.docs.map((d) => ({ id: d.id, ...d.data() })).filter((c) => c.type === type));
    })();
  }, [type]);
  return items;
}

export function Videos() {
  const items = useComponents('video');
  return (
    <Layout><h2>Videos &amp; Links</h2>
      {items.map((c) => {
        const embed = youtubeEmbedUrl(c.content?.url);
        return <div key={c.id} className="card"><strong>{c.content?.title}</strong>
          <div className="meta">{c.content?.description} — Added by {c.createdByName}</div>
          {embed ? <iframe width="100%" height="315" src={embed} title={c.content?.title} frameBorder="0" allowFullScreen /> : <a href={c.content?.url} target="_blank" rel="noreferrer">Open Website</a>}
        </div>;
      })}
    </Layout>
  );
}

export function Images() {
  const items = useComponents('image');
  const [zoom, setZoom] = useState(null);
  return (
    <Layout><h2>Images</h2>
      <div className="gallery">
        {items.map((c) => (
          <div key={c.id}><img src={c.content?.url} alt="" onClick={() => setZoom(c.content?.url)} />
            <div className="meta">{c.content?.description} — Added by {c.createdByName}</div></div>
        ))}
      </div>
      {zoom && <div className="lightbox" onClick={() => setZoom(null)}><img src={zoom} alt="" /></div>}
    </Layout>
  );
}
