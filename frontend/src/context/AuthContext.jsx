import { createContext, useContext, useState, useEffect, useRef } from "react";
import * as api from "../api";

const AuthCtx = createContext(null);

const HEARTBEAT_INTERVAL = 2 * 60 * 1000; // every 2 minutes

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);
  const hbRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem("gs_user");
    if (saved) {
      try { setUser(JSON.parse(saved)); } catch { /* ignore */ }
    }
    setLoading(false);
  }, []);

  // ── Heartbeat: keep lastSeenAt fresh while user is logged in ─────────────
  useEffect(() => {
    if (!user) {
      clearInterval(hbRef.current);
      return;
    }
    // Fire immediately on login, then every 2 min
    api.heartbeat().catch(() => {});
    hbRef.current = setInterval(() => {
      api.heartbeat().catch(() => {});
    }, HEARTBEAT_INTERVAL);
    return () => clearInterval(hbRef.current);
  }, [user?.id]);

  const _persist = (token, userData) => {
    localStorage.setItem("gs_token", token);
    localStorage.setItem("gs_user",  JSON.stringify(userData));
    setUser(userData);
  };

  // role is now required for login to enforce role-based authentication
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
    localStorage.removeItem("gs_token");
    localStorage.removeItem("gs_user");
    setUser(null);
  };

  if (loading) return null;

  return (
    <AuthCtx.Provider value={{ user, login, signup, logout, updateProfile }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
