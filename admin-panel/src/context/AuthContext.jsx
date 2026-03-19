import { createContext, useContext, useState, useEffect } from "react";
import * as api from "../api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [admin, setAdmin]   = useState(null);
  const [loading, setLoad]  = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("admin_user");
    if (saved) {
      try { setAdmin(JSON.parse(saved)); } catch {}
    }
    setLoad(false);
  }, []);

  const login = async (email, password) => {
    const data = await api.adminLogin(email, password);
    localStorage.setItem("admin_token", data.token);
    localStorage.setItem("admin_user", JSON.stringify(data.user));
    setAdmin(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_user");
    localStorage.removeItem("admin_data_cache");
    setAdmin(null);
  };

  const updateProfile = async (data) => {
    const result = await api.updateAdminProfile(data);
    if (result.token) {
      localStorage.setItem("admin_token", result.token);
      api.setToken(result.token);
    }
    const updated = result.user || { ...admin, ...data };
    localStorage.setItem("admin_user", JSON.stringify(updated));
    setAdmin(updated);
    return result;
  };

  /**
   * changePassword — calls POST /api/auth/change-password.
   * Throws on failure so the caller can display the error message.
   */
  const changePassword = async (currentPassword, newPassword) => {
    const result = await api.changeAdminPassword(currentPassword, newPassword);
    return result;
  };

  if (loading) return null;
  return (
    <AuthCtx.Provider value={{ admin, login, logout, updateProfile, changePassword }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAdmin = () => useContext(AuthCtx);
