import express from "express";

const router = express.Router();

/**
 * Semver comparison: returns 1 if vA > vB, -1 if vA < vB, 0 if equal
 */
function compareSemver(vA = "0.0.0", vB = "0.0.0") {
  const cleanA = vA.replace(/^v/i, "").split(".").map(Number);
  const cleanB = vB.replace(/^v/i, "").split(".").map(Number);

  for (let i = 0; i < Math.max(cleanA.length, cleanB.length); i++) {
    const a = cleanA[i] || 0;
    const b = cleanB[i] || 0;
    if (a > b) return 1;
    if (a < b) return -1;
  }
  return 0;
}

router.get("/", (req, res) => {
  const currentClientVersion = (req.query.current || "1.2.0").trim();
  const latestVersion = (process.env.LATEST_APP_VERSION || "1.2.0").trim();
  const repoOwner = process.env.GITHUB_REPO_OWNER || "Priyadharsant";
  const repoName = process.env.GITHUB_REPO_NAME || "Finance_Application";
  const repoBranch = process.env.GITHUB_REPO_BRANCH || "main";
  const defaultRawUrl = `https://raw.githubusercontent.com/${repoOwner}/${repoName}/${repoBranch}/App/FinFlow-Setup-${latestVersion}.exe`;
  const downloadUrl = process.env.APP_DOWNLOAD_URL || defaultRawUrl;
  const minSupportedVersion = (process.env.MIN_SUPPORTED_VERSION || "1.0.0").trim();

  const hasUpdate = compareSemver(latestVersion, currentClientVersion) > 0;
  const isMandatory = compareSemver(minSupportedVersion, currentClientVersion) > 0;

  return res.json({
    success: true,
    latestVersion,
    currentVersion: currentClientVersion,
    hasUpdate,
    isMandatory,
    releaseDate: "2026-09-29",
    downloadUrl,
    releaseNotes: [
      "Supabase Cloud Storage: Secure cloud uploads for Aadhaar, RC Book, and loan dossiers with instant previews",
      "Unified Categorized Excel Reports: Clean single-report exports for Auto Finance, Daily Finance, and Global Capital",
      "Live Financial Forecasting: Opening in-hand cash and next-month projected collection analytics",
      "Master Business Ledger: Multi-category unified audit trail and balance reconciliation",
      "Enhanced high-performance desktop caching & responsive UI"
    ],
  });
});

export default router;
