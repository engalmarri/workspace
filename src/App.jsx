import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import PagesList from './pages/PagesList.jsx';
import PageView from './pages/PageView.jsx';
import AdminPanel from './pages/AdminPanel.jsx';
import Files from './pages/Files.jsx';
import { Videos, Images } from './pages/MediaLists.jsx';
import Activity from './pages/Activity.jsx';
import Notifications from './pages/Notifications.jsx';
import Profile from './pages/Profile.jsx';
import { RequireAuth, RequireAdmin } from './components/ProtectedRoute.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<RequireAuth><Dashboard /></RequireAuth>} />
      <Route path="/pages" element={<RequireAuth><PagesList /></RequireAuth>} />
      <Route path="/pages/:id" element={<RequireAuth><PageView /></RequireAuth>} />
      <Route path="/files" element={<RequireAuth><Files /></RequireAuth>} />
      <Route path="/videos" element={<RequireAuth><Videos /></RequireAuth>} />
      <Route path="/images" element={<RequireAuth><Images /></RequireAuth>} />
      <Route path="/activity" element={<RequireAuth><Activity /></RequireAuth>} />
      <Route path="/notifications" element={<RequireAuth><Notifications /></RequireAuth>} />
      <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
      <Route path="/admin" element={<RequireAdmin><AdminPanel /></RequireAdmin>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
