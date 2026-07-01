/**
 * admin-panel/src/api/index.js — Fixed v5.0
 *
 * Fixes:
 *  - Token storage: reads ONLY from localStorage (consistent with AuthContext)
 *  - Added syncToken() so AuthContext can inject tokens on login/restore
 *  - Automatic retry on 503/429/network error (up to 2 retries, exponential back-off)
 *  - AbortController 15s timeout on every request
 *  - Proper error objects with .status and .response for backward compat
 *  - v5.0: Production-safe BASE_URL: VITE_API_URL must be set in production .env
 */

// In production (Vercel), VITE_API_URL must be set to the backend URL.
// In local dev, leave it empty — Vite proxy handles /api → localhost:5000.
const BASE_URL = import.meta.env.VITE_API_URL || "/api";

// ── In-memory token store (synced from AuthContext) ───────────────────────────
let _token = null;

/** Called by AuthContext immediately after login / page load. */
export function syncToken(token) { _token = token; }

export const getToken   = () => _token || localStorage.getItem("admin_token");
export const clearToken = () => { _token = null; localStorage.removeItem("admin_token"); };

// ── Core fetch wrapper ─────────────────────────────────────────────────────────
async function request(method, path, body, retries = 2) {
  const token   = getToken();
  const headers = {
    "Content-Type":     "application/json",
    "X-Requested-With": "XMLHttpRequest",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const controller = new AbortController();
  const timer      = setTimeout(() => controller.abort(), 15_000);

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      credentials: "include",
      body:        body !== undefined ? JSON.stringify(body) : undefined,
      signal:      controller.signal,
    });

    clearTimeout(timer);

    // Retry on transient server errors
    if ((res.status === 503 || res.status === 429) && retries > 0) {
      await new Promise(r => setTimeout(r, 500 * 2 ** (3 - retries)));
      return request(method, path, body, retries - 1);
    }

    if (!res.ok) {
      let message = `HTTP ${res.status}`;
      try { const j = await res.json(); message = j.error || j.message || message; } catch { /**/ }
      const err    = new Error(message);
      err.status   = res.status;
      err.response = { data: { error: message }, status: res.status };
      throw err;
    }

    if (res.status === 204) return null;
    return res.json();

  } catch (err) {
    clearTimeout(timer);
    if (err.name === "AbortError") {
      const e   = new Error("Request timed out. Please check your connection.");
      e.status  = 408;
      throw e;
    }
    // Network failure — retry
    if (!err.status && retries > 0) {
      await new Promise(r => setTimeout(r, 600));
      return request(method, path, body, retries - 1);
    }
    throw err;
  }
}

const get   = p      => request("GET",    p);
const post  = (p, b) => request("POST",   p, b);
const put   = (p, b) => request("PUT",    p, b);
const patch = (p, b) => request("PATCH",  p, b);
const del   = p      => request("DELETE", p);

// ── Auth ───────────────────────────────────────────────────────────────────────
export const adminLogin          = (email, password)              => post("/auth/login", { email, password, role: "admin" });
export const login               = adminLogin;  // alias for backward-compat
export const getMe               = ()                             => get("/auth/me");
export const updateAdminProfile  = (data)                         => put("/auth/profile", data);
export const changeAdminPassword = (currentPassword, newPassword) => post("/auth/change-password", { currentPassword, newPassword });

// ── Users ──────────────────────────────────────────────────────────────────────
export const getUsers          = ()   => get("/users");
export const getUserStats      = ()   => get("/users/stats");
export const getOnlineActivity = ()   => get("/users/online-activity");
export const deleteUser        = id   => del(`/users/${id}`);

// ── Categories ─────────────────────────────────────────────────────────────────
export const getCategories    = ()         => get("/categories");
export const getAllCategories  = ()         => get("/categories/all");
export const createCategory   = data       => post("/categories", data);
export const updateCategory   = (id, data) => put(`/categories/${id}`, data);
export const toggleCategory   = id         => patch(`/categories/${id}/toggle`);
export const deleteCategory   = id         => del(`/categories/${id}`);

// ── Workers ────────────────────────────────────────────────────────────────────
export const getAllWorkers = ()          => get("/workers/all");
export const getWorkers   = ()          => get("/workers/all");    // alias
export const approveWorker  = (id, body) => patch(`/workers/${id}/approve`, body);
export const deleteWorker   = id         => del(`/workers/${id}`);
export const updateWorker   = (id, d)    => put(`/workers/${id}`, d);

// ── Bookings ───────────────────────────────────────────────────────────────────
export const getBookings   = ()   => get("/bookings");
export const deleteBooking = id   => del(`/bookings/${id}`);

// ── Commission & wallet ────────────────────────────────────────────────────────
export const getCommissionWallet  = ()    => get("/commission/wallet");
export const getWallet            = ()    => get("/commission/wallet");  // alias
export const getTransactions      = ()    => get("/commission/transactions");
export const getCommissionSummary = ()    => get("/commission/summary");
export const withdraw             = (amt, note) => post("/commission/withdraw", { amount: amt, note });

// ── Pincode ────────────────────────────────────────────────────────────────────
export const lookupPincode = pincode => get(`/pincode/${pincode}`);

// ── Verification ───────────────────────────────────────────────────────────────
export const getVerificationRequests = (status = "all") =>
  get(`/verification/all${status !== "all" ? `?status=${status}` : ""}`);
export const getVerifications     = ()               => get("/verification");
export const getVerificationStats = ()               => get("/verification/stats");
export const approveVerification  = (workerId, notes) => patch(`/verification/${workerId}/approve`, { notes });
export const rejectVerification   = (workerId, notes) => patch(`/verification/${workerId}/reject`,  { notes });
export const deleteVerification   = (workerId)        => del(`/verification/${workerId}`);

// ── Health ─────────────────────────────────────────────────────────────────────
export const healthCheck = () => get("/health");

// ── History ────────────────────────────────────────────────────────────────────
export const getHistory      = type  => get(`/history${type && type !== "all" ? `?type=${type}` : ""}`);
export const clearHistory    = ()    => del("/history");
export const addHistoryEntry = entry => post("/history", entry);
// ── Commission payout account ──────────────────────────────────────────────────
export const getPayoutAccount    = ()       => get("/commission/payout-account");
export const updatePayoutAccount = (data)   => put("/commission/payout-account", data);

// ── Support / Help chat (admin) ───────────────────────────────────────────────
export const getSupportConversations = ()         => get("/support/conversations");
export const getSupportConversation  = (userId)   => get(`/support/conversations/${userId}`);
export const replySupportMessage     = (userId, text) => post(`/support/reply/${userId}`, { text });
export const markSupportRead         = (userId)   => patch(`/support/read/${userId}`, {});


// ── Admin Notifications ────────────────────────────────────────────────────────
export const getAdminNotifications     = () => get("/admin/notifications");
export const getAdminNotificationsList = () => get("/admin/notifications/list");
export const markAdminNotificationRead = (id) => patch(`/admin/notifications/${id}/read`);
export const markAllAdminNotificationsRead = () => patch("/admin/notifications/read-all");
export const clearAdminNotifications   = () => del("/admin/notifications");

// ── Category icon upload ───────────────────────────────────────────────────────
export const uploadCategoryIcon = async (file) => {
  const token = getToken();
  const form  = new FormData();
  form.append("icon", file);
  const res = await fetch(`${BASE_URL}/categories/upload-icon`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: "include",
    body: form,
  });
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try { const j = await res.json(); message = j.error || message; } catch { /**/ }
    throw new Error(message);
  }
  return res.json();
};
