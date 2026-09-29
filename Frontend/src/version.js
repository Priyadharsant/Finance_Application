import pkg from "../package.json";

/**
 * FinFlow Application Version Metadata
 */
export const APP_VERSION = pkg.version;
export const APP_BUILD_DATE = "2026-09-29";
export const APP_NAME = "FinFlow - Finance Application";
export const DEFAULT_RAW_GITHUB_DOWNLOAD_URL = `https://github.com/Priyadharsant/Finance_Application/releases/download/v${APP_VERSION}/FinFlow-Setup-${APP_VERSION}.exe`;

/**
 * Semver comparator: returns 1 if vA > vB, -1 if vA < vB, 0 if equal
 */
export function compareSemver(vA = "0.0.0", vB = "0.0.0") {
  const cleanA = String(vA).replace(/^v/i, "").split(".").map((n) => parseInt(n, 10) || 0);
  const cleanB = String(vB).replace(/^v/i, "").split(".").map((n) => parseInt(n, 10) || 0);

  for (let i = 0; i < Math.max(cleanA.length, cleanB.length); i++) {
    const a = cleanA[i] || 0;
    const b = cleanB[i] || 0;
    if (a > b) return 1;
    if (a < b) return -1;
  }
  return 0;
}

/**
 * Checks backend for available updates.
 * FinFlow enforces that older versions cannot proceed without updating.
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
    const data = await res.json();
    const hasUpdate = Boolean(data.hasUpdate) || compareSemver(data.latestVersion, APP_VERSION) > 0;
    return {
      ...data,
      hasUpdate,
      isMandatory: hasUpdate || Boolean(data.isMandatory),
      currentVersion: APP_VERSION,
    };
  } catch (err) {
    console.warn("[Update] Version check warning:", err.message);
    return {
      success: false,
      hasUpdate: false,
      isMandatory: false,
      currentVersion: APP_VERSION,
      latestVersion: APP_VERSION,
      error: err.message,
    };
  }
}
