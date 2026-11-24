# codewhiz.1 — Source Code Vault

Official source archive & project showcase for **@codewhiz.1**, designed and built by **Yazed Al-Ashkar**.

## Architecture (100% Free Tier — No Credit Card Required)
- **Firebase Authentication & Firestore:** Handles user accounts, admin roles, and project metadata.
- **Supabase Storage:** Stores preview thumbnails and `.zip` code archives (1GB free).
- **Gemini AI:** Generates concise bilingual (Arabic + English) descriptions directly from your rough project summary.

## Setup Checklist

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure `.env`:**
   Copy `.env.example` to `.env` and fill in your Firebase, Supabase, and Gemini keys.

3. **Firebase Console:**
   - Enable **Authentication** (`Email/Password` and `Google`).
   - Create **Firestore Database** and publish these rules:
     ```javascript
     rules_version = '2';
     service cloud.firestore {
       match /databases/{database}/documents {
         match /projects/{projectId} {
           allow read: if true;
           allow create, update, delete: if request.auth != null &&
             exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "admin";
         }
         match /users/{userId} {
           allow read: if request.auth != null;
           allow create, update: if request.auth != null && request.auth.uid == userId;
         }
       }
     }
     ```

4. **Supabase Dashboard (Storage):**
   Run this SQL snippet in **Supabase -> SQL Editor**:
   ```sql
   insert into storage.buckets (id, name, public)
   values ('codewhiz-vault', 'codewhiz-vault', true)
   on conflict (id) do nothing;

   drop policy if exists "Allow public access to codewhiz-vault" on storage.objects;
   create policy "Allow public access to codewhiz-vault"
   on storage.objects
   for all
   to public
   using (bucket_id = 'codewhiz-vault')
   with check (bucket_id = 'codewhiz-vault');
   ```

5. **Run & Deploy:**
   Run `npm run dev` locally or deploy to **Vercel**. Open `/vault-admin` to activate your admin account using `VITE_ADMIN_SECRET_CODE`.
