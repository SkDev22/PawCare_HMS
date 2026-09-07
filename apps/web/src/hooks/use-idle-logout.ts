import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/auth.store';

const IDLE_TIMEOUT_MS = 15 * 60 * 1000;
const WARNING_BEFORE_MS = 60 * 1000;
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'] as const;
const STORAGE_KEY = 'pawcare:lastActivity';
// Avoids writing localStorage / re-rendering on every single mousemove.
const ACTIVITY_THROTTLE_MS = 5_000;
const CHECK_INTERVAL_MS = 1_000;

// Auto-logs out a session that's been left open and unattended — e.g. an
// Admin who steps away from a shared front-desk terminal without clicking
// Logout. Only ever mounted inside DashboardLayout, which sits behind
// RequireAuth, so this is implicitly authenticated-only.
export function useIdleLogout() {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const lastActivityRef = useRef(Date.now());
  const lastWriteRef = useRef(0);

  const recordActivity = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;
    setSecondsLeft(null);
    if (now - lastWriteRef.current > ACTIVITY_THROTTLE_MS) {
      lastWriteRef.current = now;
      try {
        localStorage.setItem(STORAGE_KEY, String(now));
      } catch {
        // Private browsing / storage disabled — cross-tab sync just won't
        // apply; this tab's own idle detection still works fine.
      }
    }
  }, []);

  useEffect(() => {
    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, recordActivity, { passive: true });
    }

    // Activity in another tab of the app resets this tab's idle clock too —
    // otherwise switching tabs while actively using one would eventually
    // log out the others.
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY && e.newValue) {
        const ts = Number(e.newValue);
        if (ts > lastActivityRef.current) {
          lastActivityRef.current = ts;
          setSecondsLeft(null);
        }
      }
    }
    window.addEventListener('storage', onStorage);

    const interval = setInterval(() => {
      const idleFor = Date.now() - lastActivityRef.current;
      if (idleFor >= IDLE_TIMEOUT_MS) {
        clearInterval(interval);
        api.post('/auth/logout').catch(() => {
          // Logging out regardless of whether the server call succeeds —
          // the client-side session is being torn down either way.
        }).finally(() => {
          useAuthStore.getState().clearAuth();
          window.location.replace('/login?reason=idle');
        });
      } else if (idleFor >= IDLE_TIMEOUT_MS - WARNING_BEFORE_MS) {
        setSecondsLeft(Math.ceil((IDLE_TIMEOUT_MS - idleFor) / 1000));
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, recordActivity);
      }
      window.removeEventListener('storage', onStorage);
      clearInterval(interval);
    };
  }, [recordActivity]);

  return {
    // Non-null only inside the warning window (last 60s before logout).
    secondsLeft,
    stayLoggedIn: recordActivity,
  };
}
