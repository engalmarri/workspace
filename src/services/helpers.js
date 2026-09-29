import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../firebase.js';

export async function logActivity({ userId, userName, action, targetType, targetId, targetTitle }) {
  await addDoc(collection(db, 'activityLogs'), {
    userId, userName, action, targetType: targetType || '', targetId: targetId || '',
    targetTitle: targetTitle || '', createdAt: serverTimestamp()
  }).catch(() => {});
}

export async function notifyUser({ userId, title, body, link }) {
  await addDoc(collection(db, 'notifications'), {
    userId, title, body: body || '', link: link || '', read: false, createdAt: serverTimestamp()
  }).catch(() => {});
}

export async function touchPage(pageId) {
  await updateDoc(doc(db, 'pages', pageId), { updatedAt: serverTimestamp() }).catch(() => {});
}
