// src/utils/auth.js

// Safely read user + token from localStorage and derive auth state
export function getAuthState() {
  let user = null;
  let token = null;

  // Read and parse user
  try {
    const raw = localStorage.getItem("user");
    user = raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn("Corrupted user in localStorage, clearing.", e);
    localStorage.removeItem("user");
  }

  // Read token
  token = localStorage.getItem("token");

  // Authenticated only if BOTH exist
  const isAuthenticated = !!user && !!token;

  return { user, token, isAuthenticated };
}

// Clear all auth-related keys
export function clearAuth() {
  localStorage.removeItem("user");
  localStorage.removeItem("token");
}