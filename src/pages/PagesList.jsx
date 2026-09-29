import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase.js';
import Layout from '../components/Layout.jsx';

export default function PagesList() {
  const [pages, setPages] = useState([]);
  useEffect(() => {
    (async () => {
      const ps = await getDocs(query(collection(db, 'pages'), orderBy('order')));
      setPages(ps.docs.map((d) => ({ id: d.id, ...d.data() })));
    })();
  }, []);
  return (
    <Layout>
      <h2>Pages</h2>
      {pages.filter((p) => !p.hidden).map((p) => (
        <div key={p.id} className="card"><Link to={`/pages/${p.id}`}><strong>{p.title}</strong></Link></div>
      ))}
    </Layout>
  );
}
