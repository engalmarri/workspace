import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase.js';
import Layout from '../components/Layout.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function Dashboard() {
  const { profile } = useAuth();
  const [pages, setPages] = useState([]);
  const [activity, setActivity] = useState([]);
  const [counts, setCounts] = useState({ files: 0, images: 0, videos: 0, pending: 0 });
  const [q, setQ] = useState('');
  const [results, setResults] = useState(null);

  useEffect(() => {
    (async () => {
      const ps = await getDocs(query(collection(db, 'pages'), orderBy('order')));
      setPages(ps.docs.map((d) => ({ id: d.id, ...d.data() })));
      const acts = await getDocs(query(collection(db, 'activityLogs'), orderBy('createdAt', 'desc'), limit(10)));
      setActivity(acts.docs.map((d) => ({ id: d.id, ...d.data() })));
      const files = await getDocs(collection(db, 'files'));
      const comps = await getDocs(collection(db, 'components'));
      const revs = await getDocs(collection(db, 'revisions'));
      let images = 0, videos = 0;
      comps.forEach((d) => { if (d.data().type === 'image') images++; if (d.data().type === 'video') videos++; });
      let pending = 0;
      revs.forEach((d) => { if (d.data().status === 'pending') pending++; });
      setCounts({ files: files.size, images, videos, pending });
    })();
  }, []);

  const search = async () => {
    const term = q.trim().toLowerCase();
    if (!term) { setResults(null); return; }
    const out = { pages: [], files: [] };
    const ps = await getDocs(collection(db, 'pages'));
    ps.forEach((d) => { if ((d.data().title || '').toLowerCase().includes(term)) out.pages.push({ id: d.id, ...d.data() }); });
    const cs = await getDocs(collection(db, 'components'));
    cs.forEach((d) => {
      const c = d.data();
      const hay = JSON.stringify(c.content || '').toLowerCase();
      if (hay.includes(term)) out.files.push({ id: d.id, ...c });
    });
    setResults(out);
  };

  return (
    <Layout>
      <h2>Welcome, {profile?.displayName}</h2>
      <div className="row">
        <div className="card">Pages: <strong>{pages.length}</strong></div>
        <div className="card">Files: <strong>{counts.files}</strong></div>
        <div className="card">Images: <strong>{counts.images}</strong></div>
        <div className="card">Videos: <strong>{counts.videos}</strong></div>
        <div className="card">Pending Revisions: <strong>{counts.pending}</strong></div>
      </div>
      <div className="card">
        <h3>Search</h3>
        <div className="row">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search pages, content, files, images, videos" style={{ flex: 1 }} />
          <button className="btn" onClick={search}>Search</button>
        </div>
        {results && (
          <div>
            <h4>Pages ({results.pages.length})</h4>
            {results.pages.map((p) => <div key={p.id}><Link to={`/pages/${p.id}`}>{p.title}</Link></div>)}
            <h4>Content matches ({results.files.length})</h4>
            {results.files.map((c) => <div key={c.id} className="meta">{c.type} — page {c.pageId}</div>)}
          </div>
        )}
      </div>
      <div className="card">
        <h3>Project Pages</h3>
        {pages.filter((p) => !p.hidden).map((p) => <div key={p.id}><Link to={`/pages/${p.id}`}>{p.title}</Link></div>)}
      </div>
      <div className="card">
        <h3>Recent Activity</h3>
        {activity.map((a) => (
          <div key={a.id} className="meta">{a.userName} {a.action} {a.targetTitle ? `— ${a.targetTitle}` : ''}</div>
        ))}
      </div>
    </Layout>
  );
}
