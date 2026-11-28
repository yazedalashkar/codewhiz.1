import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  signOut,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  increment,
  serverTimestamp,
} from "firebase/firestore";
import { withTimeout } from "./diagnostics";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.authDomain
);

let app = null;
let auth = null;
let db = null;
let googleProvider = null;

if (isFirebaseConfigured) {
  app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  googleProvider = new GoogleAuthProvider();
}

export { auth, db, googleProvider };

function assertReady() {
  if (!isFirebaseConfigured || !auth || !db) {
    const err = new Error("missing-env");
    err.code = "missing-env";
    throw err;
  }
}

export async function loginWithGoogle() {
  assertReady();
  const res = await signInWithPopup(auth, googleProvider);
  const userRef = doc(db, "users", res.user.uid);
  const snap = await withTimeout(getDoc(userRef), 8000);

  if (!snap.exists()) {
    const fallbackHandle =
      res.user.email?.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "") ||
      `user_${res.user.uid.slice(0, 5)}`;
    await withTimeout(
      setDoc(userRef, {
        uid: res.user.uid,
        email: res.user.email,
        username: fallbackHandle.toLowerCase(),
        displayName: res.user.displayName || fallbackHandle,
        photoURL: res.user.photoURL || "",
        role: "member",
        createdAt: serverTimestamp(),
      }),
      8000
    );
  }
  return res.user;
}

export async function registerWithEmail({ email, password, username }) {
  assertReady();
  const normalizedUsername = username
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.]/g, "");

  if (!normalizedUsername || normalizedUsername.length < 3) {
    throw new Error("اسم المستخدم يجب أن يكون 3 أحرف إنكليزية على الأقل");
  }

  const res = await withTimeout(
    createUserWithEmailAndPassword(auth, email.trim(), password),
    10000
  );
  await updateProfile(res.user, { displayName: normalizedUsername });

  await withTimeout(
    setDoc(doc(db, "users", res.user.uid), {
      uid: res.user.uid,
      email: email.trim(),
      username: normalizedUsername,
      displayName: normalizedUsername,
      role: "member",
      createdAt: serverTimestamp(),
    }),
    8000
  );

  return res.user;
}

export async function loginWithEmail(email, password) {
  assertReady();
  const res = await withTimeout(
    signInWithEmailAndPassword(auth, email.trim(), password),
    10000
  );
  return res.user;
}

export async function logoutUser() {
  if (!auth) return;
  await signOut(auth);
}

export async function getIdToken() {
  try {
    return auth?.currentUser ? await auth.currentUser.getIdToken() : "";
  } catch {
    return "";
  }
}

// Admin status lives in /admins/{uid}; clients can read their own doc but never write it (see README rules).
export async function checkIsAdmin(uid) {
  assertReady();
  const snap = await withTimeout(getDoc(doc(db, "admins", uid)), 8000);
  return snap.exists();
}

export async function bumpDownloads(projectId) {
  if (!db) return;
  try {
    await updateDoc(doc(db, "projects", projectId), { downloads: increment(1) });
  } catch {
    /* counter is best-effort */
  }
}
