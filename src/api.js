import axios from "axios";

// ==============================
// BASE URL
// ==============================
export const API_BASE =
  process.env.REACT_APP_API_BASE || "https://sparx-backend-production-vuaj.onrender.com";

// ==============================
// AXIOS INSTANCE
// ==============================
export const api = axios.create({
  baseURL: API_BASE,
});

// ==============================
// ATTACH JWT TOKEN AUTOMATICALLY
// ==============================
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token"); // must match login storage key

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ==============================
// HANDLE 401 GLOBAL
// ==============================
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

// ==============================
// CLEAN HELPERS (USE api ONLY)
// ==============================

export const getDevices = () => api.get("/api/devices");

export const saveSession = (data) =>
  api.post("/api/sessions/start", data);

export const endSession = (data) =>
  api.post("/api/sessions/end", data);

export const startSession = (transactionId, deviceId) =>
  api.post("/api/sessions/start", { transactionId, deviceId });
