import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, doc, getDocs, orderBy, query, updateDoc, where } from 'firebase/firestore';
import { db } from '../firebase.js';
import Layout from '../components/Layout.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function Notifications() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const load = async () => {
    const s = await getDocs(query(collection(db, 'notifications'), where('userId', '==', user.uid), orderBy('createdAt', 'desc')));
    setItems(s.docs.map((d) => ({ id: d.id, ...d.data() })));
  };
  useEffect(() => { load(); }, []);
  const markRead = (n) => updateDoc(doc(db, 'notifications', n.id), { read: true }).then(load);
  return (
    <Layout><h2>Notifications</h2>
      {items.map((n) => (
        <div key={n.id} className="card" style={{ opacity: n.read ? 0.65 : 1 }}>
          <strong>{n.title}</strong><div className="meta">{n.body}</div>
          <div className="row" style={{ marginTop: 6 }}>
            {n.link && <Link className="btn small" to={n.link}>Open</Link>}
            {!n.read && <button className="btn small" onClick={() => markRead(n)}>Mark read</button>}
          </div>
        </div>
      ))}
      {items.length === 0 && <div className="card">No notifications.</div>}
    </Layout>
  );
}
