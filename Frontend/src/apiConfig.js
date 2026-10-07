/**
 * Centralized API base URL resolver.
 * Connects to local backend (http://localhost:3000) when running locally,
 * or configured VITE_BACKEND_URL / VITE_API_BASE_URL.
 */
export function getApiBaseUrl() {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL.replace(/\/$/, "");
  }
  if (import.meta.env.VITE_BACKEND_URL) {
    return `${import.meta.env.VITE_BACKEND_URL.replace(/\/$/, "")}/api`;
  }
  if (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
    return "http://localhost:3000/api";
  }
  return "/api";
}
