import axios from "axios";

// Single env var for consistency (set this in .env and on hosting/build CI)
export const API_BASE = process.env.REACT_APP_API_BASE || "https://sparx-backend-production.onrender.com";

export const api = axios.create({
  baseURL: API_BASE, // all api.post("/api/...") will be prefixed by API_BASE
});

// Optional helper calls should also use API_BASE for consistency:
export const getDevices = () => axios.get(`${API_BASE}/devices`);
export const saveSession = (data) => axios.post(`${API_BASE}/sessions/start`, data);
export const endSession = (data) => axios.post(`${API_BASE}/sessions/end`, data);
export const startSession = async (transactionId, deviceId) => {
  return fetch(`${API_BASE}/api/sessions/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transactionId, deviceId }),
  }).then((r) => r.json());
};
