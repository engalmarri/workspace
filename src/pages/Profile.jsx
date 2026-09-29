import { useState } from 'react';
import Layout from '../components/Layout.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function Profile() {
  const { profile, saveDisplayName, changePassword } = useAuth();
  const [name, setName] = useState(profile?.displayName || '');
  const [pw, setPw] = useState('');
  const [msg, setMsg] = useState('');
  const save = async () => {
    try { await saveDisplayName(name); setMsg('Display name updated.'); }
    catch (e) { setMsg('Failed: ' + e.message); }
  };
  const change = async () => {
    try { await changePassword(pw); setPw(''); setMsg('Password changed.'); }
    catch (e) { setMsg('Failed: ' + e.message); }
  };
  return (
    <Layout><h2>Profile</h2>
      <div className="card">
        <div className="meta">Email: {profile?.email} — Role: {profile?.role}</div>
        <label>Display Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} />
        <div style={{ marginTop: 8 }}><button className="btn primary" onClick={save}>Save name</button></div>
        <label>New Password</label>
        <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} />
        <div style={{ marginTop: 8 }}><button className="btn" onClick={change}>Change password</button></div>
        {msg && <div className="meta" style={{ marginTop: 8 }}>{msg}</div>}
      </div>
    </Layout>
  );
}
