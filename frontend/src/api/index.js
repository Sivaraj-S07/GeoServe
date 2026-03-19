import axios from "axios";

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || "/api" });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("gs_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Auth ──────────────────────────────────────────────────────────────────────
export const login         = (email, password, role) => api.post("/auth/login",  { email, password, role }).then(r => r.data);
export const signup        = (data)                  => api.post("/auth/signup",  data).then(r => r.data);
export const getMe         = ()                      => api.get("/auth/me").then(r => r.data);
export const updateProfile = (data)                  => api.put("/auth/profile",  data).then(r => r.data);
export const heartbeat     = ()                      => api.post("/auth/heartbeat").then(r => r.data);

// ── Categories (read-only for users/workers) ──────────────────────────────────
export const getCategories = () => api.get("/categories").then(r => r.data);

// ── Workers ───────────────────────────────────────────────────────────────────
export const getWorkers         = (params) => api.get("/workers",    { params }).then(r => r.data);
export const getMyWorkerProfile = ()       => api.get("/workers/my").then(r => r.data);
export const getWorker          = (id)     => api.get(`/workers/${id}`).then(r => r.data);
export const getWorkerPaymentInfo = (id)   => api.get(`/workers/${id}/payment-info`).then(r => r.data);
export const createWorker       = (data)   => api.post("/workers", data).then(r => r.data);
export const updateWorker       = (id, d)  => api.put(`/workers/${id}`, d).then(r => r.data);
export const updatePayoutAccount= (id, d)  => api.patch(`/workers/${id}/payout-account`, d).then(r => r.data);
export const toggleAvailability = (id, av) => api.patch(`/workers/${id}/availability`, { availability: av }).then(r => r.data);

// ── Bookings ──────────────────────────────────────────────────────────────────
export const getBookings         = (params) => api.get("/bookings", { params }).then(r => r.data);
export const createBooking       = (data)   => api.post("/bookings", data).then(r => r.data);
export const updateBookingStatus = (id, status, note) =>
  api.patch(`/bookings/${id}/status`, { status, note }).then(r => r.data);
export const confirmBooking      = (id)     => api.post(`/bookings/${id}/confirm`).then(r => r.data);
export const getBookingHistory   = (id)     => api.get(`/bookings/${id}/history`).then(r => r.data);
export const deleteBooking       = (id)     => api.delete(`/bookings/${id}`).then(r => r.data);

// ── Pincode ───────────────────────────────────────────────────────────────────
export const lookupPincode       = (pincode)         => api.get(`/pincode/${pincode}`).then(r => r.data);
export const validatePincode     = (pincode)         => api.post("/pincode/validate", { pincode }).then(r => r.data);
export const getWorkersByPincode = (pincode, params) => api.get(`/pincode/${pincode}/workers`, { params }).then(r => r.data);

// ── Verification ──────────────────────────────────────────────────────────────
export const submitVerification = (formData) =>
  api.post("/verification/submit", formData, { headers: { "Content-Type": "multipart/form-data" } }).then(r => r.data);
export const getMyVerification = () => api.get("/verification/my").then(r => r.data);
export const getMessages      = (bookingId)       => api.get(`/messages/${bookingId}`).then(r => r.data);
export const sendMessage      = (bookingId, text) => api.post(`/messages/${bookingId}`, { text }).then(r => r.data);
export const markMessagesRead = (bookingId)       => api.patch(`/messages/${bookingId}/read`).then(r => r.data);
export const getUnreadCount   = (bookingId)       => api.get(`/messages/${bookingId}/unread`).then(r => r.data);
