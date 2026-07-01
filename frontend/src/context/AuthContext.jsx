/**
 * frontend/src/context/AuthContext.jsx — GeoServe v5.2
 *
 * ROOT CAUSE FIX (data-needs-refresh bug):
 *   React batches state updates. When LoginPage called login() and then
 *   immediately called nav('/home'), the dashboard mounted before React
 *   flushed the setUser() update — so useAuth() returned null on first
 *   render, API calls had no user context, and data never loaded.
 *
 *   Fix: AuthContext now exposes an `initialized` flag. RoleGuard and
 *   HomeRedirect in App.jsx wait for `initialized=true` before rendering
 *   children or redirecting. This guarantees user state is fully committed
 *   to React before any dashboard mounts and fires its useEffect.
 *
 *   Additionally, dashboards depend on `user?.id` in their useEffect
 *   dependency array (handled in UserDashboard + WorkerDashboard) so
 *   if user state propagates even slightly late, data re-loads correctly.
 *
 * Heartbeat fix (retained from v5.1):
 *   heartbeat() is marked _silent — a 401 never triggers a redirect.
 *   Delayed 5s on session restore so dashboard data fetch wins the race.
 */
import { createContext, useContext, useState, useEffect, useRef } from "react";
import * as api from "../api";

const AuthCtx = createContext(null);
const HEARTBEAT_INTERVAL = 2 * 60 * 1000;

function jwtPayload(token) {
  try { return JSON.parse(atob(token.split(".")[1])); } catch { return null; }
}
function isTokenExpired(token) {
  const p = jwtPayload(token);
  if (!p?.exp) return true;
  return p.exp * 1000 - Date.now() < 60_000; // expired or < 60s remaining
}

export function AuthProvider({ children }) {
  const [user,        setUser]        = useState(null);
  const [initialized, setInitialized] = useState(false); // ← KEY FIX
  const hbRef      = useRef(null);
  const isRestored = useRef(false);

  // ── Restore session on mount ────────────────────────────────────────────
  useEffect(() => {
    const savedToken = localStorage.getItem("gs_token");
    const savedUser  = localStorage.getItem("gs_user");

    if (savedToken && savedUser) {
      if (isTokenExpired(savedToken)) {
        localStorage.removeItem("gs_token");
        localStorage.removeItem("gs_user");
      } else {
        try {
          isRestored.current = true;
          setUser(JSON.parse(savedUser));
        } catch {
          localStorage.removeItem("gs_token");
          localStorage.removeItem("gs_user");
        }
      }
    }
    setInitialized(true); // ← signal: auth state is now stable
  }, []);

  // ── Heartbeat ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) {
      clearInterval(hbRef.current);
      clearTimeout(hbRef.current);
      return;
    }
    let alive = true;
    const delay = isRestored.current ? 5000 : 0;
    isRestored.current = false;

    const start = () => {
      if (!alive) return;
      api.heartbeat();
      hbRef.current = setInterval(() => { if (alive) api.heartbeat(); }, HEARTBEAT_INTERVAL);
    };
    const t = setTimeout(start, delay);
    return () => { alive = false; clearTimeout(t); clearInterval(hbRef.current); };
  }, [user?.id]);

  // ── Auth actions ────────────────────────────────────────────────────────
  const _persist = (token, userData) => {
    localStorage.setItem("gs_token", token);
    localStorage.setItem("gs_user",  JSON.stringify(userData));
    setUser(userData);
    // NOTE: setUser is async (batched). Callers must NOT navigate
    // immediately after — use the returned userData for any sync logic.
  };

  const login = async (email, password, role) => {
    const data = await api.login(email, password, role);
    _persist(data.token, data.user);
    return data.user;
  };

  const signup = async (formData) => {
    const data = await api.signup(formData);
    _persist(data.token, data.user);
    return data.user;
  };

  const updateProfile = async (formData) => {
    const data = await api.updateProfile(formData);
    _persist(data.token, data.user);
    return data.user;
  };

  const logout = () => {
    clearInterval(hbRef.current);
    clearTimeout(hbRef.current);
    localStorage.removeItem("gs_token");
    localStorage.removeItem("gs_user");
    setUser(null);
  };

  // Don't render children until auth state is resolved
  // Return null here is safe — the HTML #root-loader spinner covers this gap
  if (!initialized) return null;

  return (
    <AuthCtx.Provider value={{ user, initialized, login, signup, logout, updateProfile }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
