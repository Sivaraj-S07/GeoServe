/**
 * admin-panel/src/api/index.js
 *
 * Merged API client — exposes all functions needed by both old and new pages.
 * Uses fetch (no axios dependency) with Bearer token auth.
 */

// In development: VITE_API_URL is blank → falls back to "/api" which Vite proxies to localhost:5000
// In production:  Set VITE_API_URL to your Render backend URL (e.g. https://your-app.onrender.com/api)
//                 Do NOT use http://localhost:5000/api here — the browser cannot reach localhost in prod
const BASE_URL = import.meta.env.VITE_API_URL || "/api";

// ── Token helpers ──────────────────────────────────────────────────────────────
export const getToken   = ()      => localStorage.getItem("admin_token");
export const setToken   = (token) => localStorage.setItem("admin_token", token);
export const clearToken = ()      => localStorage.removeItem("admin_token");

// ── Core fetch wrapper ─────────────────────────────────────────────────────────
async function request(method, path, body) {
  const token = getToken();
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try { const j = await res.json(); message = j.error || j.message || message; } catch {}
    const err = new Error(message);
    err.status = res.status;
    // Mimic axios-style response for backward compat
    err.response = { data: { error: message }, status: res.status };
    throw err;
  }

  if (res.status === 204) return null;
  return res.json();
}

const get   = (path)       => request("GET",    path);
const post  = (path, body) => request("POST",   path, body);
const put   = (path, body) => request("PUT",    path, body);
const patch = (path, body) => request("PATCH",  path, body);
const del   = (path)       => request("DELETE", path);

// ── Auth ───────────────────────────────────────────────────────────────────────
export const adminLogin = (email, password) => post("/auth/login", { email, password, role: "admin" });
export const login      = (email, password) => post("/auth/login", { email, password, role: "admin" });
export const getMe      = ()                => get("/auth/me");
export const updateAdminProfile  = (data)                         => put("/auth/profile", data);
export const changeAdminPassword = (currentPassword, newPassword) => post("/auth/change-password", { currentPassword, newPassword });

// ── Users ──────────────────────────────────────────────────────────────────────
export const getUsers          = ()   => get("/users");
export const getUserStats      = ()   => get("/users/stats");
export const getOnlineActivity = ()   => get("/users/online-activity");
export const deleteUser        = (id) => del(`/users/${id}`);

// ── Categories ─────────────────────────────────────────────────────────────────
export const getCategories  = ()         => get("/categories");
export const createCategory = (data)     => post("/categories", data);
export const updateCategory = (id, data) => put(`/categories/${id}`, data);
export const deleteCategory = (id)       => del(`/categories/${id}`);

// ── Workers ────────────────────────────────────────────────────────────────────
export const getAllWorkers  = ()         => get("/workers/all");
export const getWorkers     = ()         => get("/workers/all");   // alias
export const approveWorker  = (id, body) => patch(`/workers/${id}/approve`, body);
export const deleteWorker   = (id)       => del(`/workers/${id}`);
export const updateWorker   = (id, d)    => put(`/workers/${id}`, d);

// ── Bookings ───────────────────────────────────────────────────────────────────
export const getBookings   = ()   => get("/bookings");
export const deleteBooking = (id) => del(`/bookings/${id}`);

// ── Commission & wallet ────────────────────────────────────────────────────────
export const getCommissionWallet  = ()    => get("/commission/wallet");
export const getWallet            = ()    => get("/commission/wallet");   // alias
export const getTransactions      = ()    => get("/commission/transactions");
export const getCommissionSummary = ()    => get("/commission/summary");
export const withdraw             = (amt) => post("/commission/withdraw", { amount: amt });

// ── Pincode ────────────────────────────────────────────────────────────────────
export const lookupPincode = (pincode) => get(`/pincode/${pincode}`);

// ── Verification ───────────────────────────────────────────────────────────────
export const getVerificationRequests = (status = "all") =>
  get(`/verification/all${status !== "all" ? `?status=${status}` : ""}`);
export const getVerifications     = ()              => get("/verification");
export const getVerificationStats = ()              => get("/verification/stats");
export const approveVerification  = (workerId, notes) =>
  patch(`/verification/${workerId}/approve`, { notes });
export const rejectVerification   = (workerId, notes) =>
  patch(`/verification/${workerId}/reject`, { notes });

// ── Health ─────────────────────────────────────────────────────────────────────
export const healthCheck = () => get("/health");

// ── History ────────────────────────────────────────────────────────────────────
export const getHistory      = (type)  => get(`/history${type && type !== "all" ? `?type=${type}` : ""}`);
export const clearHistory    = ()      => del("/history");
export const addHistoryEntry = (entry) => post("/history", entry);
