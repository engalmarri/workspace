import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, updatePassword, updateProfile } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase.js';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const snap = await getDoc(doc(db, 'users', u.uid)).catch(() => null);
        setProfile(snap && snap.exists() ? { id: snap.id, ...snap.data() } : null);
      } else setProfile(null);
      setLoading(false);
    });
  }, []);

  const login = (email, password) => signInWithEmailAndPassword(auth, email, password);
  const logout = () => signOut(auth);
  const isAdmin = profile && profile.role === 'admin' && profile.active !== false;
  const refreshProfile = async () => {
    if (!auth.currentUser) return;
    const snap = await getDoc(doc(db, 'users', auth.currentUser.uid));
    if (snap.exists()) setProfile({ id: snap.id, ...snap.data() });
  };
  const saveDisplayName = async (name) => {
    await updateProfile(auth.currentUser, { displayName: name });
    await updateDoc(doc(db, 'users', auth.currentUser.uid), { displayName: name, updatedAt: new Date() });
    await refreshProfile();
  };
  const changePassword = (pw) => updatePassword(auth.currentUser, pw);

  return <Ctx.Provider value={{ user, profile, loading, login, logout, isAdmin, refreshProfile, saveDisplayName, changePassword }}>{children}</Ctx.Provider>;
}
