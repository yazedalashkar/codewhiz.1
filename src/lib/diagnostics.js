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

export function diagnoseError(error, lang = "ar") {
  const code = String(error?.code || error?.message || "").toLowerCase();
  const googleMsg = String(error?.googleMessage || "");
  const googleMsgLower = googleMsg.toLowerCase();
  const isAr = lang === "ar";

  if (code.includes("missing-env")) {
    return {
      title: isAr ? "ملف البيئة (.env) غير مكتمل" : "Missing .env Configuration",
      detail: isAr
        ? "تأكد من إنشاء ملف .env في جذر المشروع وإضافة مفاتيح Firebase و Supabase ثم أعد تشغيل السيرفر."
        : "Create a .env file in the project root with your Firebase and Supabase keys, then restart the server.",
    };
  }

  if (code.includes("supabase-missing-env")) {
    return {
      title: isAr ? "مفاتيح Supabase Storage غير موجودة" : "Missing Supabase Keys",
      detail: isAr
        ? "أضف VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY داخل ملف .env ثم أعد تشغيل السيرفر."
        : "Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file and restart.",
    };
  }

  if (code.includes("bucket not found")) {
    return {
      title: isAr ? "حاوية التخزين (Bucket) غير موجودة في Supabase" : "Supabase Bucket Not Found",
      detail: isAr
        ? "افتح Supabase -> Storage وأنشئ Bucket عام (Public) باسم codewhiz-vault."
        : "Open Supabase -> Storage and create a Public bucket named codewhiz-vault.",
    };
  }

  if (code.includes("row-level security") || code.includes("violates row-level")) {
    return {
      title: isAr ? "صلاحيات الرفع في Supabase Storage مرفوضة" : "Supabase Storage Policy Blocked",
      detail: isAr
        ? "افتح Supabase -> Storage -> Policies وأضف سياسة (Policy) تسمح بـ INSERT و SELECT على حاوية codewhiz-vault."
        : "Open Supabase -> Storage -> Policies and allow INSERT and SELECT on bucket codewhiz-vault.",
    };
  }

  if (code.includes("payload too large") || code.includes("413") || code.includes("maximum allowed size")) {
    return {
      title: isAr ? "حجم الملف يتجاوز الحد المجاني (50MB)" : "File Exceeds 50MB Free Limit",
      detail: isAr
        ? "الخطة المجانية في Supabase تسمح بملفات حتى 50 ميغابايت للملف الواحد. ضغط الملف أو تقليل حجم الصورة سيحل المشكلة."
        : "Supabase Free Tier supports up to 50MB per file. Compress the archive or optimize the image.",
    };
  }

  if (code.includes("configuration-not-found")) {
    return {
      title: isAr ? "خدمة Authentication غير مفعّلة" : "Authentication Not Configured",
      detail: isAr
        ? "افتح Firebase Console -> Authentication -> Sign-in method وفعّل Email/Password و Google."
        : "Open Firebase Console -> Authentication -> Sign-in method and enable Email/Password and Google.",
    };
  }

  if (code.includes("unauthorized-domain")) {
    return {
      title: isAr ? "النطاق غير مصرح به (Unauthorized Domain)" : "Unauthorized Domain",
      detail: isAr
        ? "أضف رابط موقعك (مثل دومين Vercel) في Firebase Console -> Authentication -> Settings -> Authorized domains."
        : "Add your domain (e.g. Vercel URL) under Authentication -> Settings -> Authorized domains.",
    };
  }

  if (code.includes("email-already-in-use")) {
    return {
      title: isAr ? "البريد الإلكتروني مسجّل مسبقاً" : "Email Already Registered",
      detail: isAr
        ? "هذا البريد مستخدم بالفعل. انتقل إلى وضع تسجيل الدخول بدلاً من إنشاء حساب جديد."
        : "This email is already registered. Switch to Sign In instead.",
    };
  }

  if (
    code.includes("invalid-credential") ||
    code.includes("wrong-password") ||
    code.includes("user-not-found")
  ) {
    return {
      title: isAr ? "بيانات الدخول غير صحيحة" : "Invalid Credentials",
      detail: isAr
        ? "تأكد من صحة البريد الإلكتروني وكلمة المرور وحاول مرة أخرى."
        : "Double-check your email and password and try again.",
    };
  }

  if (code.includes("weak-password")) {
    return {
      title: isAr ? "كلمة المرور قصيرة" : "Weak Password",
      detail: isAr
        ? "يجب أن تتكون كلمة المرور من 6 أحرف أو أرقام على الأقل."
        : "Password must be at least 6 characters long.",
    };
  }

  if (code.includes("popup-closed-by-user") || code.includes("cancelled-popup-request")) {
    return {
      title: isAr ? "تم إغلاق نافذة Google" : "Google Sign-In Cancelled",
      detail: isAr
        ? "تم إغلاق نافذة تسجيل الدخول قبل إتمام العملية."
        : "The sign-in popup was closed before completing authentication.",
    };
  }

  if (code.includes("permission-denied")) {
    return {
      title: isAr ? "صلاحيات قاعدة البيانات مرفوضة" : "Firestore Permission Denied",
      detail: isAr
        ? "تحقق من تفعيل Firestore Database ونشر قواعد الحماية (Rules) ومنح حسابك دور admin."
        : "Verify Firestore is enabled, security rules are published, and your user has the admin role.",
    };
  }

  // Gemini Specific Diagnostics
  if (code.includes("gemini-empty-notes")) {
    return {
      title: isAr ? "الوصف البسيط مطلوب" : "Rough Description Required",
      detail: isAr
        ? "اكتب فكرة المشروع أو الوصف البسيط في الخانة المخصصة أولاً ليتمكن الذكاء الاصطناعي من صياغته."
        : "Enter your short project notes first so AI can formulate the descriptions.",
    };
  }

  if (code.includes("gemini-missing-key")) {
    return {
      title: isAr ? "مفتاح Gemini API غير مقروء" : "Gemini API Key Missing",
      detail: isAr
        ? "تأكد من وجود VITE_GEMINI_API_KEY في ملف .env ثم أعد تشغيل السيرفر (npm run dev) ليتم تحميله."
        : "Ensure VITE_GEMINI_API_KEY is set in .env and restart your dev server.",
    };
  }

  if (googleMsgLower.includes("location is not supported")) {
    return {
      title: isAr ? "Gemini API غير متاح في الموقع الجغرافي الحالي" : "Unsupported Region for Gemini API",
      detail: isAr
        ? "Google تقيّد الوصول المباشر إلى Gemini API من منطقتك الجغرافية. فعّل VPN ثم اضغط زر التوليد مرة أخرى."
        : "Google restricts Gemini API access in your current region. Enable a VPN and try again.",
    };
  }

  if (googleMsgLower.includes("api key not valid") || googleMsgLower.includes("api_key_invalid")) {
    return {
      title: isAr ? "مفتاح Gemini API غير صالح" : "Invalid Gemini API Key",
      detail: isAr
        ? "المفتاح الموجود في VITE_GEMINI_API_KEY غير صحيح أو منسوخ بشكل ناقص. انسخه مجدداً من Google AI Studio."
        : "The API key in VITE_GEMINI_API_KEY is invalid. Copy a valid key from Google AI Studio.",
    };
  }

  if (
    googleMsgLower.includes("has not been used in project") ||
    googleMsgLower.includes("is disabled") ||
    googleMsgLower.includes("service_blocked")
  ) {
    return {
      title: isAr ? "واجهة Generative Language API غير مفعّلة" : "Generative Language API Disabled",
      detail: isAr
        ? "فعّل Generative Language API في مشروع Google Cloud المرتبط بالمفتاح أو أنشئ مفتاحاً جديداً من Google AI Studio."
        : "Enable Generative Language API in Google Cloud Console or create a new key in Google AI Studio.",
    };
  }

  if (
    code.includes("gemini-429") ||
    googleMsgLower.includes("resource_exhausted") ||
    googleMsgLower.includes("quota")
  ) {
    return {
      title: isAr ? "تم تجاوز حد الطلبات المؤقت (Rate Limit)" : "Gemini Rate Limit Reached",
      detail: isAr
        ? "تم استهلاك الحد المسموح للدقيقة أو للمشروع. انتظر 30 ثانية وحاول مجدداً."
        : "Request quota temporarily exceeded. Wait 30 seconds and retry.",
    };
  }

  if (code.includes("gemini")) {
    return {
      title: isAr
        ? `خطأ من خادم Gemini (${error?.status || "API"})`
        : `Gemini Server Error (${error?.status || "API"})`,
      detail:
        googleMsg ||
        (isAr
          ? "تعذّر الحصول على استجابة صالحة من Gemini API."
          : "Could not receive a valid response from Gemini API."),
    };
  }

  if (
    code.includes("request-timeout") ||
    code.includes("unavailable") ||
    code.includes("network-request-failed") ||
    code.includes("offline")
  ) {
    return {
      title: isAr ? "انتهت مهلة الاتصال أو تعذّر الوصول للخادم" : "Connection Timeout / Offline",
      detail: isAr
        ? "تأكد من اتصال الإنترنت ومن إعدادات Firestore و Supabase."
        : "Check your internet connection and verify Firestore and Supabase settings.",
    };
  }

  return {
    title: isAr ? "حدث خطأ غير متوقع" : "Unexpected Error",
    detail: error?.message || (isAr ? "يرجى المحاولة مرة أخرى." : "Please try again."),
  };
}
