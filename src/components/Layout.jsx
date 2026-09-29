import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Layout({ children }) {
  const { profile, isAdmin, logout } = useAuth();
  const nav = useNavigate();
  const links = [
    ['/', 'Dashboard'], ['/pages', 'Pages'], ['/files', 'Files'],
    ['/videos', 'Videos'], ['/images', 'Images'], ['/activity', 'Activity'],
    ['/notifications', 'Notifications'], ['/profile', 'Profile']
  ];
  if (isAdmin) links.push(['/admin', 'Admin Panel']);
  const out = async () => { await logout(); nav('/login'); };
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <h2>Graduation Workspace</h2>
        <div className="meta" style={{ padding: '0 16px 8px', color: '#9aa1a8' }}>Petroleum Engineering</div>
        <nav>
          {links.map(([to, label]) => <NavLink key={to} to={to} className={({ isActive }) => isActive ? 'active' : ''}>{label}</NavLink>)}
          <button className="link" onClick={out}>Logout ({profile?.displayName || profile?.email})</button>
        </nav>
      </aside>
      <div className="main">
        <div className="topbar">
          <strong>Graduation Project Workspace</strong>
          <span className="meta">{profile?.displayName} — {isAdmin ? 'Administrator' : 'Team Member'}</span>
        </div>
        <div className="mobile-nav">
          {links.map(([to, label]) => <NavLink key={to} to={to} className="btn small">{label}</NavLink>)}
          <button className="btn small" onClick={out}>Logout</button>
        </div>
        <div className="content">{children}</div>
        <div className="footer">© 2026 Alitalebaljaidi</div>
      </div>
    </div>
  );
}
