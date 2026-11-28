# codewhiz.1 — خزنة الأكواد

أرشيف مشاريع @codewhiz.1 (تصميم وتطوير يازد الأشقر). Firebase للحسابات والبيانات، Supabase للملفات، Gemini لصياغة الأوصاف.

## التشغيل
```bash
npm install
cp .env.example .env   # املأ المفاتيح
npm run dev
```

## ⚠️ قواعد Firestore (مهم: تغيّرت)
النسخة القديمة كانت تسمح لأي مستخدم بمنح نفسه صلاحية admin، ورمز الأمان كان ظاهراً داخل ملفات الموقع. الآن المشرف يُحدَّد بوجود وثيقة في مجموعة `admins` لا يستطيع أحد الكتابة فيها من المتصفح.

الصق هذه القواعد في Firestore → Rules ثم Publish:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAdmin() {
      return request.auth != null &&
        exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }

    match /projects/{id} {
      allow read: if true;
      allow create, update, delete: if isAdmin();
      // أي زائر يستطيع زيادة عدّاد التحميل فقط
      allow update: if request.resource.data.diff(resource.data).affectedKeys().hasOnly(['downloads'])
        && request.resource.data.downloads == resource.data.downloads + 1;
    }

    match /users/{uid} {
      allow read: if request.auth != null && request.auth.uid == uid;
      allow create: if request.auth != null && request.auth.uid == uid
        && request.resource.data.role == 'member';
      allow update: if request.auth != null && request.auth.uid == uid
        && request.resource.data.role == resource.data.role;
    }

    match /admins/{uid} {
      allow read: if request.auth != null && request.auth.uid == uid;
      allow write: if false;
    }
  }
}
```

### تفعيل حسابك كمشرف (مرة واحدة)
1. افتح `/vault-admin` وسجّل الدخول، سيعرض لك الـ UID.
2. Firebase Console ← Firestore ← أنشئ مجموعة `admins` ← وثيقة معرّفها هو الـ UID.
3. اضغط «إعادة الفحص».

## Supabase Storage
```sql
insert into storage.buckets (id, name, public)
values ('codewhiz-vault', 'codewhiz-vault', true)
on conflict (id) do nothing;

drop policy if exists "Allow public access to codewhiz-vault" on storage.objects;
create policy "Allow public access to codewhiz-vault"
on storage.objects for all to public
using (bucket_id = 'codewhiz-vault')
with check (bucket_id = 'codewhiz-vault');
```

## الذكاء الاصطناعي (Gemini)
- على **Vercel**: أضف `GEMINI_API_KEY` في Environment Variables ثم أعد النشر. الصياغة تمر عبر `/api/describe` من خادم Vercel، فتعمل حتى لو كانت Google تحجب Gemini في بلدك، ويبقى المفتاح سرياً، والمسار مقفل على المشرفين فقط.
- محلياً (`npm run dev`): ضع `VITE_GEMINI_API_KEY` في `.env`. الاتصال مباشر من المتصفح وقد يحتاج VPN في بعض الدول.
- النظام يكتشف النماذج المتاحة لمفتاحك تلقائياً ويجرّب بديلاً عند فشل أي نموذج. إذا فشل كل شيء يضع مسودة محلية بسيطة (مُعلَّمة بأنها ليست AI) بدل ترك الحقول فارغة.
- اختصار: `Ctrl/⌘ + Enter` داخل خانة الفكرة يبدأ الصياغة.

## النشر على Vercel
متغيرات البيئة: كل متغيرات `VITE_FIREBASE_*` و `VITE_SUPABASE_*` + `GEMINI_API_KEY`. أضف نطاق Vercel إلى Firebase ← Authentication ← Authorized domains.
