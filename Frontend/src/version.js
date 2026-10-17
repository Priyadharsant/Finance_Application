import pkg from "../package.json";

/**
 * KAMBAM FINANCE Application Version Metadata
 */
export const APP_VERSION = pkg.version;
export const APP_BUILD_DATE = "2026-10-17";
export const APP_NAME = "KAMBAM FINANCE";
export const DEFAULT_RAW_GITHUB_DOWNLOAD_URL = `https://github.com/Priyadharsant/Finance_Application/releases/download/v${APP_VERSION}/KAMBAM.FINANCE-Setup-${APP_VERSION}.exe`;

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
 * Checks for available updates.
 * Uses high-speed direct GitHub releases check (~150ms) to avoid Render sleeping server delays,
 * with graceful fallback to backend version endpoint.
 */
export async function checkForAppUpdates() {
  // 1. Fast Path: Direct GitHub Releases API (responds in ~150ms with zero spin-up lag)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const ghRes = await fetch(
      "https://api.github.com/repos/Priyadharsant/Finance_Application/releases/latest",
      {
        signal: controller.signal,
        headers: { Accept: "application/vnd.github.v3+json" },
      }
    );
    clearTimeout(timeoutId);

    if (ghRes.ok) {
      const ghData = await ghRes.json();
      const rawTag = ghData.tag_name || ghData.name || "";
      const latestVer = rawTag.replace(/^v/i, "").trim();

      const exeAsset = ghData.assets?.find(
        (a) => a.name.endsWith(".exe") || a.name.includes("Setup")
      );
      const downloadUrl =
        exeAsset?.browser_download_url ||
        `https://github.com/Priyadharsant/Finance_Application/releases/download/${rawTag}/KAMBAM.FINANCE-Setup-${latestVer}.exe`;

      const hasUpdate = compareSemver(latestVer, APP_VERSION) > 0;
      return {
        success: true,
        latestVersion: latestVer,
        currentVersion: APP_VERSION,
        hasUpdate,
        isMandatory: hasUpdate,
        releaseDate: ghData.published_at ? ghData.published_at.slice(0, 10) : "",
        downloadUrl,
        releaseNotes: ghData.body
          ? ghData.body.split("\n").filter((l) => l.trim())
          : ["Latest performance, security, and feature updates"],
      };
    }
  } catch (ghErr) {
    console.warn("[VersionCheck] GitHub fast check fallback:", ghErr.message);
  }

  // 2. Fallback Path: Backend version endpoint
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const apiBase =
      import.meta.env.VITE_API_BASE_URL ||
      (import.meta.env.VITE_BACKEND_URL
        ? `${import.meta.env.VITE_BACKEND_URL.replace(/\/$/, "")}/api`
        : "https://finance-application-y6oo.onrender.com/api");
    const res = await fetch(`${apiBase}/version?current=${APP_VERSION}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(timeoutId);
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
