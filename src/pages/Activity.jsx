import { useEffect, useState } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase.js';
import Layout from '../components/Layout.jsx';

export default function Activity() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    (async () => {
      const s = await getDocs(query(collection(db, 'activityLogs'), orderBy('createdAt', 'desc')));
      setItems(s.docs.map((d) => ({ id: d.id, ...d.data() })));
    })();
  }, []);
  return (
    <Layout><h2>Activity Log</h2>
      <div className="card"><table className="grid">
        <thead><tr><th>User</th><th>Action</th><th>Target</th></tr></thead>
        <tbody>{items.map((a) => <tr key={a.id}><td>{a.userName}</td><td>{a.action}</td><td>{a.targetTitle || a.targetId}</td></tr>)}</tbody>
      </table></div>
    </Layout>
  );
}
