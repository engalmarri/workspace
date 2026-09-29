# Graduation Project Workspace — Petroleum Engineering

Workspace web app for a 5-member graduation team + academic supervisor.
React + Vite + Firebase (project: `graduation-project-workspace`), GitHub-hosted.

## Firebase wiring status (already done from CLI)

- [x] Project `graduation-project-workspace` selected (`.firebaserc`)
- [x] Web app `Workspace Web` created — config is in local `.env` (gitignored, never commit it)
- [x] `firestore.rules` deployed and compiled — database auto-created
- [x] `firestore.indexes.json` deployed (notifications composite index)
- [ ] Storage rules: open https://console.firebase.google.com/project/graduation-project-workspace/storage
  once, click **Get Started**, then run `firebase deploy --only storage`
- [ ] Auth provider: open https://console.firebase.google.com/project/graduation-project-workspace/authentication/providers
  and enable **Email/Password** (one click — cannot be done from CLI)

## Quick start (local)

1. Install Node 18+.
2. `cd workspace-app && npm install`
3. Create Firebase project `graduation-project-workspace`, enable:
   - Authentication > Email/Password
   - Cloud Firestore (production mode) — deploy `firestore.rules`
   - Storage — deploy `storage.rules`
4. Copy web config into `.env`:
   ```
   VITE_FB_API_KEY=...
   VITE_FB_AUTH_DOMAIN=graduation-project-workspace.firebaseapp.com
   VITE_FB_PROJECT_ID=graduation-project-workspace
   VITE_FB_STORAGE_BUCKET=graduation-project-workspace.appspot.com
   VITE_FB_SENDER_ID=...
   VITE_FB_APP_ID=...
   ```
5. `npm run dev` — open the printed localhost URL.
6. Create the first admin: register via Firebase Console Authentication,
   then add matching `users/{uid}` doc: `{ email, displayName, role: 'admin', active: true }`.
   Or run `node scripts/seed.mjs` with a service account (see file header).
7. Login as admin > Admin Panel > "Seed default pages" + add the 5 members.

## Deploy (GitHub + Firebase Hosting)

1. Push this folder to GitHub.
2. `npm install -g firebase-tools && firebase login`
3. `firebase use graduation-project-workspace`
4. `npm run build && firebase deploy`
5. Set the `.env` values as GitHub Secrets if CI is used.

## Acceptance walkthrough

Admin creates 5 accounts > creates "Reservoir Study" page + admin writes doc
(autosave shows Saving.../Saved, author name recorded) > member B opens page,
clicks "Suggest an edit" (original untouched, "X suggested an edit" note)
> admin opens revision, compares Original vs Suggested with highlighted diff,
Accept (official version updates, history logged) or Reject (original kept)
> member uploads image + description, adds YouTube link, uploads Excel file
> all visible/downloadable by team > admin can delete/edit anything
> member edits Profile name/password > admin manages members
> team exports page to PDF and DOCX (A4 layout preserved).

## Security model (defense in depth)

- UI hides admin routes (RequireAdmin) AND Firestore rules enforce
  role === 'admin' for pages/revisions review/user management.
- Members edit only via Suggested Revisions on docs; Storage writes capped
  at 20 MB with content-type checks; member file delete limited to own files
  in rules (admin full access).
- For production user provisioning prefer a Cloud Function with Admin SDK
  (client-side creation in AdminPanel is a bootstrap convenience and forces
  re-login; documented in code).

## Extensibility

`COMPONENT_TYPES` in `src/utils/constants.js` — add e.g. `task`, `comment`
then a renderer branch in `PageView.jsx`. Collections already isolated:
users, pages, components, revisions, files, activityLogs, notifications.
