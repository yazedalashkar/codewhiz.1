# codewhiz.1 — Source Code Vault (v2.0)

Official source archive & project showcase for **@codewhiz.1**, designed and built by **Yazed Al-Ashkar**.

## What's New in v2.0
- **Reliable AI Description Generator**: Routes through `/api/generate-description` (Vercel Serverless Function) to bypass regional geo-blocks, with multi-model fallback (`gemini-2.5-flash`, `gemini-2.0-flash`, `gemini-2.0-flash-lite`, `gemini-1.5-flash`), structured JSON output, tone selector, and an offline Smart Local Polish backup.
- **Editorial Studio Design + Scroll-Driven 3D Sculptures**: Warm-obsidian & ivory designer aesthetic with GPU-accelerated 3D geometric sculptures (`ScrollSculptures.jsx`) driven by mouse scroll & pointer parallax.
- **Mobile-First Experience**: Natural smooth scrolling, safe-area aware floating bottom dock, bottom-sheet modals, and a React Portal floating toast system (`ToastProvider.jsx`) so notifications always appear reliably on mobile.
- **Auto-Resetting Monthly Visitors Counter**: Tracks unique monthly visits in Firestore (`analytics/visitors_YYYY-MM`), automatically resetting to 0 on the 1st of every calendar month.
- **Pro Features**: Bookmarks ("Saved"), `Ctrl+K` Command Palette, direct project deep-links (`?project=<id>`), download counter & sorting, project editing, live file previews, and 2-step delete confirmation in `/vault-admin`.

## Setup Checklist

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure `.env` (and Vercel Environment Variables):**
   Copy `.env.example` to `.env` and fill in your Firebase, Supabase, and Gemini keys.
   > On **Vercel**, add `GEMINI_API_KEY` (or `VITE_GEMINI_API_KEY`) in Project Settings -> Environment Variables so `/api/generate-description` runs server-side without geo-restrictions.

3. **Firebase Console (Firestore Rules):**
   Update your Firestore rules to include the `analytics` collection for the monthly-resetting visitor counter:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /projects/{projectId} {
         allow read: if true;
         allow update: if request.resource.data.diff(resource.data).affectedKeys().hasOnly(['downloads']);
         allow create, update, delete: if request.auth != null &&
           exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
           get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "admin";
       }
       match /users/{userId} {
         allow read: if request.auth != null;
         allow create, update: if request.auth != null && request.auth.uid == userId;
       }
       match /analytics/{docId} {
         allow read, create, update: if docId.matches('visitors_[0-9]{4}-[0-9]{2}');
       }
     }
   }
   ```

4. **Run & Deploy:**
   Run `npm run dev` locally or deploy to **Vercel**. Open `/vault-admin` to manage and publish projects.
