import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// Team roster: dropdown selection maps to the Firebase Auth email behind the scenes.
const TEAM = [
  { name: 'Dr. Alaa Shafiq Al-Duqail', title: 'Supervisor', email: 'supervisor@gmail.com' },
  { name: 'Ali Taleb Bin Krishan', title: 'Admin', email: 'alitaleb@gmail.com' },
  { name: 'Ali Fadl Al-Salahi', title: 'Member', email: 'ali@gmail.com' },
  { name: 'Saeed Ahmed Al-Jabri', title: 'Member', email: 'saeed@gmail.com' },
  { name: 'Muneer Mahmoud Muqbil', title: 'Member', email: 'muneer@gmail.com' }
];

export default function Login() {
  const [selected, setSelected] = useState(0);
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const { login } = useAuth();
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault(); setErr('');
    try { await login(TEAM[selected].email, password); nav('/'); }
    catch (ex) { setErr('Login failed: wrong password for ' + TEAM[selected].name + '.'); }
  };

  return (
    <div className="login-wrap">
      <form className="card login-card" onSubmit={submit}>
        <h2>Graduation Project Workspace</h2>
        <div className="meta">Petroleum Engineering — select your name and enter your password</div>
        <label>Team member</label>
        <select value={selected} onChange={(e) => setSelected(Number(e.target.value))}>
          {TEAM.map((m, i) => (
            <option key={m.email} value={i}>{m.name} — {m.title}</option>
          ))}
        </select>
        <label>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Enter your personal password" />
        {err && <div className="meta" style={{ color: '#b91c1c' }}>{err}</div>}
        <div style={{ marginTop: 12 }}><button className="btn primary" style={{ width: '100%' }}>Login as {TEAM[selected].name.split(' ').slice(0, 2).join(' ')}</button></div>
      </form>
    </div>
  );
}
