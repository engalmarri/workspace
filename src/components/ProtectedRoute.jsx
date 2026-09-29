import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="content">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
export function RequireAdmin({ children }) {
  const { user, profile, loading } = useAuth();
  if (loading) return <div className="content">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!profile || profile.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}
