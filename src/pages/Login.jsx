import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const { login } = useAuth();
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault(); setErr('');
    try { await login(email, password); nav('/'); }
    catch (ex) { setErr('Login failed: ' + ex.message); }
  };

  return (
    <div className="login-wrap">
      <form className="card login-card" onSubmit={submit}>
        <h2>Graduation Project Workspace</h2>
        <div className="meta">Petroleum Engineering — sign in to continue</div>
        <label>Email / Username</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} required />
        <label>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {err && <div className="meta" style={{ color: '#b91c1c' }}>{err}</div>}
        <div style={{ marginTop: 12 }}><button className="btn primary" style={{ width: '100%' }}>Login</button></div>
      </form>
    </div>
  );
}
