import {
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  increment,
  serverTimestamp,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";

/**
 * Returns a YYYY-MM key (e.g. "2026-11").
 * Using the month key as part of the Firestore document ID guarantees
 * an automatic zero-reset on the 1st of every single month without any cron jobs.
 */
export function getCurrentMonthKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function formatMonthLabel(monthKey, lang = "ar") {
  try {
    const [y, m] = String(monthKey).split("-").map(Number);
    const d = new Date(y, (m || 1) - 1, 1);
    return new Intl.DateTimeFormat(lang === "ar" ? "ar-EG" : "en-US", {
      month: "long",
      year: "numeric",
    }).format(d);
  } catch {
    return monthKey;
  }
}

export function getDaysRemainingInMonth(date = new Date()) {
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  return Math.max(0, lastDay - date.getDate());
}

function getLocalFallbackCount(monthKey) {
  try {
    const key = `cw_local_visitors_${monthKey}`;
    const visitedFlag = `cw_local_counted_${monthKey}`;
    let count = parseInt(localStorage.getItem(key) || "0", 10);
    if (!Number.isFinite(count) || count < 0) count = 0;

    if (!localStorage.getItem(visitedFlag)) {
      count += 1;
      localStorage.setItem(key, String(count));
      localStorage.setItem(visitedFlag, "1");
    }
    return count;
  } catch {
    return 1;
  }
}

/**
 * Records a unique monthly visit (deduplicated per browser per month)
 * and subscribes to live monthly visitor count updates.
 * Automatically resets every calendar month.
 */
export function subscribeMonthlyVisitors(onChange) {
  const monthKey = getCurrentMonthKey();

  if (!isFirebaseConfigured || !db) {
    const localCount = getLocalFallbackCount(monthKey);
    onChange({ count: localCount, monthKey, source: "local", loading: false });
    return () => {};
  }

  const docRef = doc(db, "analytics", `visitors_${monthKey}`);
  const storageFlag = `cw_visited_month_${monthKey}`;

  // Record unique monthly visit once per browser per month
  let alreadyCounted = false;
  try {
    alreadyCounted = Boolean(localStorage.getItem(storageFlag));
  } catch {
    alreadyCounted = false;
  }

  if (!alreadyCounted) {
    setDoc(
      docRef,
      {
        month: monthKey,
        count: increment(1),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    )
      .then(() => {
        try {
          localStorage.setItem(storageFlag, String(Date.now()));
        } catch {
          // ignore storage quota errors
        }
      })
      .catch(() => {
        // Fallback silently if Firestore rules don't allow analytics writes yet
      });
  }

  const unsubscribe = onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        const val = Number(snap.data()?.count) || 0;
        onChange({ count: val, monthKey, source: "firestore", loading: false });
      } else {
        onChange({
          count: alreadyCounted ? 1 : 0,
          monthKey,
          source: "firestore",
          loading: false,
        });
      }
    },
    () => {
      // Graceful fallback if Firestore analytics rules are not configured
      const localCount = getLocalFallbackCount(monthKey);
      onChange({ count: localCount, monthKey, source: "local", loading: false });
    }
  );

  return unsubscribe;
}

/**
 * Increments a project's download count in Firestore (gracefully ignored if rules block public writes).
 */
export async function trackProjectDownload(projectId) {
  if (!projectId || !isFirebaseConfigured || !db) return;
  try {
    await updateDoc(doc(db, "projects", projectId), {
      downloads: increment(1),
    });
  } catch {
    // Non-blocking: ignore if Firestore rules only allow admin updates on projects
  }
}
