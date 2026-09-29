/**
 * FinFlow Application Version Metadata
 */
export const APP_VERSION = "1.2.0";
export const APP_BUILD_DATE = "2026-09-29";
export const APP_NAME = "FinFlow - Finance Application";
export const DEFAULT_RAW_GITHUB_DOWNLOAD_URL = `https://github.com/Priyadharsant/Finance_Application/releases/download/v${APP_VERSION}/FinFlow-Setup-${APP_VERSION}.exe`;

/**
 * Checks backend for available updates
 */
export async function checkForAppUpdates() {
  try {
    const apiBase =
      import.meta.env.VITE_API_BASE_URL ||
      (import.meta.env.VITE_BACKEND_URL
        ? `${import.meta.env.VITE_BACKEND_URL.replace(/\/$/, "")}/api`
        : "https://finance-application-y6oo.onrender.com/api");
    const res = await fetch(`${apiBase}/version?current=${APP_VERSION}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error("Could not check for updates");
    return await res.json();
  } catch (err) {
    console.warn("[Update] Version check warning:", err.message);
    return {
      success: false,
      hasUpdate: false,
      currentVersion: APP_VERSION,
      latestVersion: APP_VERSION,
      error: err.message,
    };
  }
}
