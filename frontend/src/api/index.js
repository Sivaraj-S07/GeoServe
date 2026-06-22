/**
 * frontend/src/api/index.js — GeoServe v5.1
 *
 * FIX 1: 401 interceptor no longer redirects on silent/background requests
 *         (heartbeat, etc). Only redirects when the failing call is a
 *         user-initiated foreground request, indicated by the absence of
 *         config._silent = true.
 * FIX 2: heartbeat() marked as silent so a 401 never redirects the page.
 * FIX 3: Normalized error shape — err.message always set.
 */
import axios from "axios";

const api = axios.create({
  baseURL:         import.meta.env.VITE_API_URL || "/api",
  timeout:         15_000,
  withCredentials: true,
  headers:         { "X-Requested-With": "XMLHttpRequest" },
});

// Attach token from localStorage on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("gs_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Normalize errors + conditional 401 redirect + retry
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const config = err.config || {};
    const status = err.response?.status;

    // 401 → only redirect if this is NOT a silent/background call
    if (status === 401 && !config._silent) {
      const hasToken = !!localStorage.getItem("gs_token");
      if (hasToken) {
        // Token exists but server rejected it — it's expired or invalid
        localStorage.removeItem("gs_token");
        localStorage.removeItem("gs_user");
        if (!window.location.pathname.includes("/login")) {
          window.location.href = "/login";
          return new Promise(() => {}); // Never resolve — page is navigating
        }
      }
    }

    // Retry transient errors (network / 503) — but NOT 429 on auth routes (makes rate limit worse)
    config._retryCount = config._retryCount || 0;
    const isAuthRoute = (config.url || "").includes("/auth/login") || (config.url || "").includes("/auth/signup");
    if ((!err.response || status === 503 || (status === 429 && !isAuthRoute)) && config._retryCount < 2) {
      config._retryCount += 1;
      await new Promise(r => setTimeout(r, 500 * (2 ** config._retryCount)));
      return api(config);
    }

    // Normalize to err.message for consistent catching in all pages
    const message =
      err.response?.data?.error ||
      err.response?.data?.message ||
      err.message ||
      "An unexpected error occurred";
    const normalized    = new Error(message);
    normalized.status   = status;
    normalized.original = err;
    return Promise.reject(normalized);
  }
);

// ── Auth ─────────────────────────────────────────────────────────────────────
export const login    = (email, password, role) =>
  api.post("/auth/login",  { email, password, role }).then(r => r.data);
export const signup   = (data) =>
  api.post("/auth/signup",  data).then(r => r.data);
export const getMe    = () =>
  api.get("/auth/me").then(r => r.data);
export const updateProfile = (data) =>
  api.put("/auth/profile",  data).then(r => r.data);
export const changePassword = (currentPassword, newPassword) =>
  api.post("/auth/change-password", { currentPassword, newPassword }).then(r => r.data);

// heartbeat is a SILENT background call — a 401 must never redirect
export const heartbeat = () =>
  api.post("/auth/heartbeat", undefined, { _silent: true }).then(r => r.data).catch(() => null);

// ── Categories ───────────────────────────────────────────────────────────────
export const getCategories = () => api.get("/categories").then(r => r.data);

// ── Workers ──────────────────────────────────────────────────────────────────
export const getWorkers           = (params) => api.get("/workers",    { params }).then(r => r.data);
export const getMyWorkerProfile   = ()       => api.get("/workers/my").then(r => r.data);
export const getWorker            = (id)     => api.get(`/workers/${id}`).then(r => r.data);
export const getWorkerPaymentInfo = (id)     => api.get(`/workers/${id}/payment-info`).then(r => r.data);
export const getWorkerPricing     = (id)     => api.get(`/workers/${id}/pricing`).then(r => r.data);
export const updateWorkerPricing  = (id, d)  => api.patch(`/workers/${id}/pricing`, d).then(r => r.data);
export const createWorker         = (data)   => api.post("/workers", data).then(r => r.data);
export const updateWorker         = (id, d)  => api.put(`/workers/${id}`, d).then(r => r.data);
export const updatePayoutAccount  = (id, d)  => api.patch(`/workers/${id}/payout-account`, d).then(r => r.data);
export const toggleAvailability   = (id, av) => api.patch(`/workers/${id}/availability`, { availability: av }).then(r => r.data);

// ── Bookings ─────────────────────────────────────────────────────────────────
export const getBookings         = (params)           => api.get("/bookings", { params }).then(r => r.data);
export const createBooking       = (data)             => api.post("/bookings", data).then(r => r.data);
export const updateBookingStatus = (id, status, note) => api.patch(`/bookings/${id}/status`, { status, note }).then(r => r.data);
export const confirmBooking      = (id, paymentMode)  => api.post(`/bookings/${id}/confirm`, { paymentMode: paymentMode || "cash" }).then(r => r.data);
export const getBookingHistory   = (id)               => api.get(`/bookings/${id}/history`).then(r => r.data);
export const deleteBooking       = (id)               => api.delete(`/bookings/${id}`).then(r => r.data);

// ── Pincode ──────────────────────────────────────────────────────────────────
export const lookupPincode       = (pincode)         => api.get(`/pincode/${pincode}`).then(r => r.data);
export const validatePincode     = (pincode)         => api.post("/pincode/validate", { pincode }).then(r => r.data);
export const getWorkersByPincode = (pincode, params) => api.get(`/pincode/${pincode}/workers`, { params }).then(r => r.data);

// ── Verification ─────────────────────────────────────────────────────────────
export const submitVerification = (formData) =>
  api.post("/verification/submit", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  }).then(r => r.data);
export const getMyVerification      = ()           => api.get("/verification/my").then(r => r.data);
export const getAllVerifications     = (params)     => api.get("/verification/all", { params }).then(r => r.data);
export const getVerificationStats   = ()           => api.get("/verification/stats").then(r => r.data);
export const approveVerification    = (workerId, notes) => api.patch(`/verification/${workerId}/approve`, { notes }).then(r => r.data);
export const rejectVerification     = (workerId, notes) => api.patch(`/verification/${workerId}/reject`,  { notes }).then(r => r.data);
export const deleteVerification     = (workerId)   => api.delete(`/verification/${workerId}`).then(r => r.data);

// ── Messages ─────────────────────────────────────────────────────────────────
export const getMessages      = (bookingId)       => api.get(`/messages/${bookingId}`).then(r => r.data);
export const sendMessage      = (bookingId, text) => api.post(`/messages/${bookingId}`, { text }).then(r => r.data);
export const markMessagesRead = (bookingId)       => api.patch(`/messages/${bookingId}/read`).then(r => r.data);
export const getUnreadCount   = (bookingId)       => api.get(`/messages/${bookingId}/unread`).then(r => r.data);

export default api;

// ── Support / Help chat ────────────────────────────────────────────────────────
export const getSupportMessages  = ()      => api.get("/support/messages").then(r => r.data);
export const sendSupportMessage  = (text)  => api.post("/support/messages", { text }).then(r => r.data);

// ── Ratings ───────────────────────────────────────────────────────────────────
export const submitRating        = (bookingId, stars, review) =>
  api.post("/ratings", { bookingId, stars, review }).then(r => r.data);
export const getBookingRating    = (bookingId) =>
  api.get(`/ratings/booking/${bookingId}`).then(r => r.data);
export const getWorkerRatings    = (workerId)  =>
  api.get(`/ratings/worker/${workerId}`).then(r => r.data);

// ── Admin: Workers ────────────────────────────────────────────────────────────
export const getAllWorkers  = ()      => api.get("/workers/all").then(r => r.data);
export const approveWorker = (id)    => api.patch(`/workers/${id}/approve`).then(r => r.data);
export const deleteWorker  = (id)    => api.delete(`/workers/${id}`).then(r => r.data);

// ── Admin: Users ──────────────────────────────────────────────────────────────
export const getUsers  = ()   => api.get("/users").then(r => r.data);
export const deleteUser = (id) => api.delete(`/users/${id}`).then(r => r.data);

// ── Admin: Categories ─────────────────────────────────────────────────────────
export const getAllCategories = () => api.get("/categories/all").then(r => r.data);

export const createCategory = (data) =>
  api.post("/categories", data).then(r => r.data);

export const updateCategory = (id, data) =>
  api.put(`/categories/${id}`, data).then(r => r.data);

export const deleteCategory = (id) =>
  api.delete(`/categories/${id}`).then(r => r.data);

export const toggleCategory = (id) =>
  api.patch(`/categories/${id}/toggle`).then(r => r.data);

/**
 * Upload a category icon image.
 * Returns { url: "/uploads/categories/<filename>" }
 */
export const uploadCategoryIcon = (file) => {
  const fd = new FormData();
  fd.append("icon", file);
  return api.post("/categories/upload-icon", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  }).then(r => r.data);
};
