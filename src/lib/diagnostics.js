export function withTimeout(promise, ms = 9000, timeoutCode = "request-timeout") {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const err = new Error(timeoutCode);
      err.code = timeoutCode;
      reject(err);
    }, ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

// Each rule: [test(code, googleMsg, error), arabic title, arabic detail, english title, english detail]
// Order matters: specific rules first, generic ones last.
const RULES = [
  [(c) => c.includes("supabase-missing-env"),
    "مفاتيح Supabase Storage غير موجودة", "أضف VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY داخل ملف .env ثم أعد تشغيل السيرفر.",
    "Missing Supabase keys", "Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env and restart."],
  [(c) => c === "missing-env" || c.includes("missing-env"),
    "ملف البيئة (.env) غير مكتمل", "أنشئ ملف .env في جذر المشروع وأضف مفاتيح Firebase و Supabase ثم أعد تشغيل السيرفر.",
    "Missing .env configuration", "Create a .env file with your Firebase and Supabase keys, then restart the server."],
  [(c) => c.includes("bucket not found"),
    "حاوية التخزين غير موجودة في Supabase", "افتح Supabase ← Storage وأنشئ Bucket عاماً باسم codewhiz-vault.",
    "Supabase bucket not found", "Create a public bucket named codewhiz-vault in Supabase Storage."],
  [(c) => c.includes("row-level security") || c.includes("violates row-level"),
    "صلاحيات الرفع في Supabase مرفوضة", "أضف Policy تسمح بـ INSERT و SELECT على الحاوية codewhiz-vault (الكود جاهز في README).",
    "Supabase storage policy blocked", "Allow INSERT and SELECT on bucket codewhiz-vault (SQL is in the README)."],
  [(c) => c.includes("payload too large") || /\b413\b/.test(c) || c.includes("maximum allowed size"),
    "حجم الملف يتجاوز الحد المجاني (50MB)", "الخطة المجانية تسمح بـ 50 ميغابايت للملف. اضغط الملف أو صغّر الصورة.",
    "File exceeds the 50MB free limit", "Compress the archive or optimise the image."],
  [(c) => c.includes("configuration-not-found"),
    "خدمة Authentication غير مفعّلة", "فعّل Email/Password و Google من Firebase ← Authentication ← Sign-in method.",
    "Authentication not configured", "Enable Email/Password and Google under Authentication → Sign-in method."],
  [(c) => c.includes("unauthorized-domain"),
    "النطاق غير مصرّح به", "أضف رابط موقعك في Firebase ← Authentication ← Settings ← Authorized domains.",
    "Unauthorized domain", "Add your domain under Authentication → Settings → Authorized domains."],
  [(c) => c.includes("email-already-in-use"),
    "البريد مسجّل مسبقاً", "استخدم تسجيل الدخول بدلاً من إنشاء حساب جديد.",
    "Email already registered", "Switch to Sign in instead."],
  [(c) => c.includes("invalid-credential") || c.includes("wrong-password") || c.includes("user-not-found"),
    "بيانات الدخول غير صحيحة", "تأكد من البريد وكلمة المرور وحاول مجدداً.",
    "Invalid credentials", "Check your email and password and try again."],
  [(c) => c.includes("weak-password"),
    "كلمة المرور قصيرة", "يجب أن تكون 6 أحرف أو أرقام على الأقل.",
    "Weak password", "Use at least 6 characters."],
  [(c) => c.includes("popup-closed-by-user") || c.includes("cancelled-popup-request"),
    "أُغلقت نافذة Google", "أُغلقت نافذة تسجيل الدخول قبل اكتمال العملية.",
    "Google sign-in cancelled", "The popup was closed before sign-in finished."],
  [(c) => c.includes("ai-unauthorized"),
    "الصياغة بالذكاء الاصطناعي للمشرف فقط", "سجّل الدخول بحساب المشرف (موجود في مجموعة admins) ثم أعد المحاولة.",
    "AI drafting is admin-only", "Sign in with an account listed in the admins collection and retry."],
  [(c) => c.includes("gemini-empty-notes"),
    "الوصف البسيط مطلوب", "اكتب فكرة المشروع في الخانة المخصصة أولاً.",
    "Rough notes required", "Write your short project notes first."],
  [(c) => c.includes("gemini-missing-key"),
    "مفتاح Gemini غير موجود", "أضف GEMINI_API_KEY في إعدادات Vercel (أو VITE_GEMINI_API_KEY محلياً) ثم أعد النشر/التشغيل.",
    "Gemini API key missing", "Set GEMINI_API_KEY on Vercel (or VITE_GEMINI_API_KEY locally) and redeploy/restart."],
  [(c, g) => g.includes("location is not supported"),
    "Gemini غير متاح في موقعك الجغرافي", "انشر المشروع على Vercel ليستخدم مسار /api/describe من خادم مدعوم، أو فعّل VPN أثناء التجربة المحلية.",
    "Gemini unavailable in your region", "Deploy to Vercel so /api/describe runs from a supported region, or use a VPN locally."],
  [(c, g) => g.includes("api key not valid") || g.includes("api_key_invalid"),
    "مفتاح Gemini غير صالح", "انسخ مفتاحاً جديداً من Google AI Studio وتأكد أنه كامل بلا مسافات.",
    "Invalid Gemini API key", "Copy a fresh key from Google AI Studio."],
  [(c, g) => g.includes("has not been used in project") || g.includes("is disabled") || g.includes("service_blocked"),
    "واجهة Generative Language API غير مفعّلة", "أنشئ مفتاحاً جديداً من Google AI Studio أو فعّل الواجهة في Google Cloud.",
    "Generative Language API disabled", "Create a new key in Google AI Studio or enable the API in Google Cloud."],
  [(c, g) => c.includes("gemini-429") || g.includes("resource_exhausted") || g.includes("quota"),
    "تجاوزت حد الطلبات المؤقت", "انتظر نحو 30 ثانية وحاول مجدداً.",
    "Gemini rate limit reached", "Wait about 30 seconds and retry."],
  [(c) => c.includes("gemini-blocked"),
    "رفض Gemini هذا النص", "أعد كتابة الوصف البسيط بصياغة مختلفة وحاول مجدداً.",
    "Gemini blocked this text", "Rephrase your notes and try again."],
  [(c) => c.includes("gemini-bad-response"),
    "ردّ Gemini غير مفهوم", "حاول مرة ثانية، وإن تكرر الأمر اختصر الوصف البسيط.",
    "Gemini returned an unreadable reply", "Retry, or shorten your notes."],
  [(c) => c.includes("gemini-network"),
    "تعذّر الوصول إلى خوادم Gemini", "غالباً حظر شبكة أو إضافة حجب إعلانات. انشر على Vercel لاستخدام المسار الخلفي، أو جرّب VPN.",
    "Could not reach Gemini", "Likely a network block or ad-blocker. Deploy to Vercel to use the server route, or try a VPN."],
  [(c) => c.includes("permission-denied") || c.includes("missing or insufficient permissions"),
    "صلاحيات Firestore مرفوضة", "انشر قواعد الحماية من README وأضف معرّف حسابك (UID) في مجموعة admins.",
    "Firestore permission denied", "Publish the rules from the README and add your UID to the admins collection."],
  [(c) => c.includes("request-timeout") || c.includes("unavailable") || c.includes("network-request-failed") || c.includes("offline"),
    "انتهت مهلة الاتصال", "تأكد من الإنترنت ومن إعدادات Firestore و Supabase.",
    "Connection timeout", "Check your connection and your Firestore / Supabase settings."],
];

export function diagnoseError(error, lang = "ar") {
  const code = String(error?.code || error?.message || "").toLowerCase();
  const googleMsg = String(error?.googleMessage || "");
  const g = googleMsg.toLowerCase();
  const isAr = lang === "ar";

  for (const [test, titleAr, detailAr, titleEn, detailEn] of RULES) {
    if (test(code, g, error)) {
      return { title: isAr ? titleAr : titleEn, detail: isAr ? detailAr : detailEn };
    }
  }

  if (code.startsWith("gemini")) {
    return {
      title: isAr ? `خطأ من Gemini (${error?.status || "API"})` : `Gemini error (${error?.status || "API"})`,
      detail: googleMsg || (isAr ? "تعذّر الحصول على ردّ صالح." : "No valid response received."),
    };
  }

  return {
    title: isAr ? "حدث خطأ غير متوقع" : "Unexpected error",
    detail: error?.message || (isAr ? "حاول مرة أخرى." : "Please try again."),
  };
}
