/**
 * AuthContext.jsx — GeoServe v5.0
 * FIX: syncToken() called BEFORE setAdmin() so first API call after login has the token.
 * FIX: JWT expiry checked before trusting saved session.
 * FIX: logout() clears all admin keys atomically.
 */
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import * as api from "../api";

const AuthCtx = createContext(null);

function jwtPayload(token) {
  try { return JSON.parse(atob(token.split(".")[1])); } catch { return null; }
}
function isExpired(token) {
  const p = jwtPayload(token);
  return !p?.exp || p.exp * 1000 < Date.now();
}

export function AuthProvider({ children }) {
  const [admin,   setAdmin]  = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    const user  = localStorage.getItem("admin_user");
    if (token && user && !isExpired(token)) {
      try {
        api.syncToken(token);          // sync FIRST
        setAdmin(JSON.parse(user));
      } catch {
        localStorage.removeItem("admin_token");
        localStorage.removeItem("admin_user");
      }
    } else if (token || user) {
      localStorage.removeItem("admin_token");
      localStorage.removeItem("admin_user");
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await api.adminLogin(email, password);
    if (data.user?.role !== "admin")
      throw new Error("Access denied. Admin accounts only.");
    api.syncToken(data.token);        // sync BEFORE setAdmin
    localStorage.setItem("admin_token", data.token);
    localStorage.setItem("admin_user",  JSON.stringify(data.user));
    setAdmin(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    api.syncToken(null);
    ["admin_token","admin_user","admin_data_cache"].forEach(k => localStorage.removeItem(k));
    setAdmin(null);
  }, []);

  const updateProfile = useCallback(async (data) => {
    const result = await api.updateAdminProfile(data);
    if (result.token) {
      api.syncToken(result.token);
      localStorage.setItem("admin_token", result.token);
    }
    const updated = result.user || { ...admin, ...data };
    localStorage.setItem("admin_user", JSON.stringify(updated));
    setAdmin(updated);
    return result;
  }, [admin]);

  const changePassword = useCallback((cur, next) =>
    api.changeAdminPassword(cur, next), []);

  if (loading) return null;

  return (
    <AuthCtx.Provider value={{ admin, login, logout, updateProfile, changePassword }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAdmin = () => {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAdmin must be inside <AuthProvider>");
  return ctx;
};
