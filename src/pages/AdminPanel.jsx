import { useEffect, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../firebase.js';
import Layout from '../components/Layout.jsx';
import { DEFAULT_PAGES } from '../utils/constants.js';
import { logActivity } from '../services/helpers.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function AdminPanel() {
  const { user, profile } = useAuth();
  const [users, setUsers] = useState([]);
  const [pages, setPages] = useState([]);
  const [pending, setPending] = useState([]);
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('member');
  const [newPage, setNewPage] = useState('');

  const load = async () => {
    setUsers((await getDocs(collection(db, 'users'))).docs.map((d) => ({ id: d.id, ...d.data() })));
    setPages((await getDocs(query(collection(db, 'pages'), orderBy('order')))).docs.map((d) => ({ id: d.id, ...d.data() })));
    setPending((await getDocs(query(collection(db, 'revisions'), where('status', '==', 'pending')))).docs.map((d) => ({ id: d.id, ...d.data() })));
  };
  useEffect(() => { load(); }, []);

  const seedPages = async () => {
    for (let i = 0; i < DEFAULT_PAGES.length; i++) {
      await addDoc(collection(db, 'pages'), {
        title: DEFAULT_PAGES[i], order: i, hidden: false,
        createdBy: user.uid, createdByName: profile?.displayName, createdAt: serverTimestamp(), updatedAt: serverTimestamp()
      });
    }
    await logActivity({ userId: user.uid, userName: profile?.displayName, action: 'seeded default pages', targetType: 'pages' });
    load();
  };

  // NOTE: creating auth users from client signs in as the new user; for
  // simplicity we create via secondary flow and advise re-login. Production
  // setups should use a Cloud Function with Admin SDK instead.
  const addUser = async () => {
    const cred = await createUserWithEmailAndPassword(auth, email, pw);
    await updateDoc(doc(db, 'users', cred.user.uid), {}).catch(() => {});
    const { setDoc } = await import('firebase/firestore');
    await setDoc(doc(db, 'users', cred.user.uid), {
      email, displayName: name || email, role, active: true, createdAt: serverTimestamp()
    });
    await logActivity({ userId: user.uid, userName: profile?.displayName, action: `added user ${email}`, targetType: 'user', targetId: cred.user.uid });
    alert('User created. You were signed in as the new user — please log back in as admin.');
    setEmail(''); setPw(''); setName(''); load();
  };

  const setActive = (u, active) => updateDoc(doc(db, 'users', u.id), { active }).then(load);
  const changeRole = async (u, r) => updateDoc(doc(db, 'users', u.id), { role: r }).then(load);
  const delUser = (u) => { if (confirm(`Delete ${u.email}?`)) deleteDoc(doc(db, 'users', u.id)).then(load); };
  const renameUser = (u) => { const v = prompt('New display name:', u.displayName); if (v) updateDoc(doc(db, 'users', u.id), { displayName: v }).then(load); };

  const addPage = async () => {
    if (!newPage.trim()) return;
    await addDoc(collection(db, 'pages'), { title: newPage.trim(), order: pages.length, hidden: false, createdBy: user.uid, createdByName: profile?.displayName, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    setNewPage(''); load();
  };
  const renamePage = (p) => { const v = prompt('New title:', p.title); if (v) updateDoc(doc(db, 'pages', p.id), { title: v }).then(load); };
  const toggleHide = (p) => updateDoc(doc(db, 'pages', p.id), { hidden: !p.hidden }).then(load);
  const delPage = (p) => { if (confirm(`Delete page "${p.title}"?`)) deleteDoc(doc(db, 'pages', p.id)).then(load); };
  const move = async (p, dir) => {
    const sorted = [...pages].sort((a, b) => a.order - b.order);
    const i = sorted.findIndex((x) => x.id === p.id);
    const j = i + dir;
    if (j < 0 || j >= sorted.length) return;
    await updateDoc(doc(db, 'pages', sorted[i].id), { order: sorted[j].order });
    await updateDoc(doc(db, 'pages', sorted[j].id), { order: sorted[i].order });
    load();
  };

  return (
    <Layout>
      <h2>Admin Panel</h2>
      <div className="card"><h3>Pending Revisions: {pending.length}</h3>
        {pending.map((r) => <div key={r.id} className="meta">{r.createdByName} suggested changes (page {r.pageId})</div>)}
      </div>
      <div className="card"><h3>Team Members ({users.length})</h3>
        <table className="grid"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Active</th><th>Actions</th></tr></thead>
          <tbody>{users.map((u) => (
            <tr key={u.id}><td>{u.displayName}</td><td>{u.email}</td><td>{u.role}</td><td>{u.active === false ? 'disabled' : 'active'}</td>
              <td><div className="row">
                <button className="btn small" onClick={() => renameUser(u)}>Rename</button>
                <button className="btn small" onClick={() => changeRole(u, u.role === 'admin' ? 'member' : 'admin')}>Make {u.role === 'admin' ? 'member' : 'admin'}</button>
                <button className="btn small" onClick={() => setActive(u, u.active === false ? true : false)}>{u.active === false ? 'Enable' : 'Disable'}</button>
                <button className="btn small danger" onClick={() => delUser(u)}>Delete</button>
              </div></td></tr>))}</tbody></table>
        <h4>Add member</h4>
        <div className="row">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Display name" style={{ flex: 1 }} />
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" style={{ flex: 1 }} />
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Password" style={{ flex: 1 }} />
          <select value={role} onChange={(e) => setRole(e.target.value)} style={{ width: 130 }}><option value="member">member</option><option value="admin">admin</option></select>
          <button className="btn primary" onClick={addUser}>Add</button>
        </div>
      </div>
      <div className="card"><h3>Pages ({pages.length})</h3>
        <div className="row">
          <input value={newPage} onChange={(e) => setNewPage(e.target.value)} placeholder="New page title" style={{ flex: 1 }} />
          <button className="btn primary" onClick={addPage}>Add Page</button>
          {pages.length === 0 && <button className="btn" onClick={seedPages}>Seed default pages</button>}
        </div>
        <table className="grid" style={{ marginTop: 10 }}><thead><tr><th>Order</th><th>Title</th><th>Hidden</th><th>Actions</th></tr></thead>
          <tbody>{pages.map((p) => (
            <tr key={p.id}><td>{p.order}</td><td>{p.title}</td><td>{p.hidden ? 'yes' : 'no'}</td>
              <td><div className="row">
                <button className="btn small" onClick={() => renamePage(p)}>Rename</button>
                <button className="btn small" onClick={() => toggleHide(p)}>{p.hidden ? 'Show' : 'Hide'}</button>
                <button className="btn small" onClick={() => move(p, -1)}>Up</button>
                <button className="btn small" onClick={() => move(p, 1)}>Down</button>
                <button className="btn small danger" onClick={() => delPage(p)}>Delete</button>
              </div></td></tr>))}</tbody></table>
      </div>
    </Layout>
  );
}
