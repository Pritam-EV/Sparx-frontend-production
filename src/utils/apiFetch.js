// src/utils/apiFetch.js
const BASE = (process.env.REACT_APP_API_BASE || process.env.REACT_APP_Backend_API_Base_URL || "").replace(/\/+$/, "");

export const apiFetch = async (url, options = {}) => {
  const token = localStorage.getItem("token");
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  let finalUrl = url;

  // Prefix only if relative
  if (!/^https?:\/\//i.test(finalUrl)) {
    finalUrl = `${BASE}${finalUrl.startsWith("/") ? "" : "/"}${finalUrl}`;
  } else {
    // Fix common typo: https// -> https://
    finalUrl = finalUrl.replace(/^https\/\//i, "https://").replace(/^http\/\//i, "http://");
  }

  // console.log("apiFetch ->", { BASE, url, finalUrl });

 const requestOptions = {
  ...options,
  headers,
};

if (
  requestOptions.body &&
  typeof requestOptions.body === "object" &&
  !(requestOptions.body instanceof FormData)
) {
  requestOptions.body = JSON.stringify(requestOptions.body);
}

const res = await fetch(finalUrl, requestOptions);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json();
};
