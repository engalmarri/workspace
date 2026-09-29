// Optional seed script (Node). Requires a Firebase service-account JSON.
// Usage: GOOGLE_APPLICATION_CREDENTIALS=./sa.json node scripts/seed.mjs
// Creates: 11 default pages + placeholder user docs are created on first login;
// admin promotion is done by setting users/{uid}.role = 'admin' in console.
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const PAGES = ['Introduction', 'Literature Review', 'Methodology', 'Reservoir',
  'Drilling', 'Production', 'Data Analysis', 'Results', 'Discussion',
  'Conclusion', 'References'];

initializeApp();
const db = getFirestore();
for (let i = 0; i < PAGES.length; i++) {
  await db.collection('pages').add({
    title: PAGES[i], order: i, hidden: false,
    createdBy: 'seed', createdByName: 'seed',
    createdAt: new Date(), updatedAt: new Date()
  });
  console.log('added', PAGES[i]);
}
console.log('done');
