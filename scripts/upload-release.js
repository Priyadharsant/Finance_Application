#!/usr/bin/env node
import fs from "fs";
import path from "path";
import https from "https";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");

function loadToken() {
  if (process.env.GH_TOKEN) return process.env.GH_TOKEN;
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  for (const f of [
    path.join(ROOT_DIR, ".env"),
    path.join(ROOT_DIR, "Backend", ".env"),
  ]) {
    if (fs.existsSync(f)) {
      const match = fs
        .readFileSync(f, "utf-8")
        .match(/^(?:GH_TOKEN|GITHUB_TOKEN)=(.*)$/m);
      if (match && match[1].trim()) return match[1].trim();
    }
  }
  return null;
}

function computeSha512(filePath) {
  const hash = crypto.createHash("sha512");
  hash.update(fs.readFileSync(filePath));
  return hash.digest("base64");
}

function uploadFileStream(uploadUrl, filePath, contentType, token) {
  return new Promise((resolve, reject) => {
    const fileStats = fs.statSync(filePath);
    const totalBytes = fileStats.size;
    const urlObj = new URL(uploadUrl);

    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method: "POST",
      headers: {
        Authorization: `token ${token}`,
        "Content-Type": contentType,
        "Content-Length": totalBytes,
        "User-Agent": "KAMBAM-FINANCE-Uploader/1.0",
      },
      timeout: 15 * 60 * 1000, // 15 minutes timeout
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve(data);
          }
        } else {
          reject(
            new Error(`Upload failed with status ${res.statusCode}: ${data}`),
          );
        }
      });
    });

    req.on("error", (err) => reject(err));
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Upload request timed out"));
    });

    let uploadedBytes = 0;
    let lastPercent = -1;
    const stream = fs.createReadStream(filePath, {
      highWaterMark: 1024 * 1024,
    });

    stream.on("data", (chunk) => {
      uploadedBytes += chunk.length;
      const pct = Math.round((uploadedBytes / totalBytes) * 100);
      if (pct !== lastPercent && pct % 1 === 0) {
        lastPercent = pct;
        process.stdout.write(
          `  ⏳ ${pct}% (${(uploadedBytes / (1024 * 1024)).toFixed(1)} / ${(totalBytes / (1024 * 1024)).toFixed(1)} MB)\r`,
        );
      }
    });

    stream.on("end", () => {
      console.log(`\n  ✓ Stream finished, awaiting server confirmation...`);
    });

    stream.on("error", (err) => {
      req.destroy();
      reject(err);
    });

    stream.pipe(req);
  });
}

async function main() {
  const token = loadToken();
  if (!token) {
    console.error("❌ Error: GH_TOKEN not found in environment or .env");
    process.exit(1);
  }

  const pkg = JSON.parse(
    fs.readFileSync(path.join(ROOT_DIR, "package.json"), "utf-8"),
  );
  const version = pkg.version;
  const tag = `v${version}`;
  const owner = "Priyadharsant";
  const repo = "Finance_Application";

  console.log(`\n========================================================`);
  console.log(` Uploading KAMBAM FINANCE Release ${tag} to GitHub`);
  console.log(`========================================================`);

  const headers = {
    Authorization: `token ${token}`,
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "KAMBAM-FINANCE-Uploader/1.0",
  };

  // 1. Get or create release
  let release = null;
  const getRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/releases/tags/${tag}`,
    { headers },
  );
  if (getRes.ok) {
    release = await getRes.json();
    console.log(`✓ Found existing release ${tag} (id: ${release.id})`);
  } else {
    console.log(`Creating release for ${tag}...`);
    const createRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/releases`,
      {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          tag_name: tag,
          target_commitish: "main",
          name: `KAMBAM FINANCE v${version}`,
          body: `### KAMBAM FINANCE v${version}\n\n- Detailed Inline Error Display: Real-time company cash shortage alerts and error messages inside loan top-up & closure modals\n- Global Cash Capital Protection: Transparent validation and currency formatted explanation when company funds are lower than requested disbursement\n- Notification Visibility: Fixed notification toast layer (z-index 99999) to always show on top of popups\n- Automated 3-Day Rolling Backups: Continuous hourly compressed database backups retained across 72 hours\n- Fast Auto-Updater: Silent background downloader with automatic single-instance relaunch`,
          draft: false,
          prerelease: false,
        }),
      },
    );
    if (!createRes.ok) {
      const errText = await createRes.text();
      throw new Error(
        `Failed to create release: ${createRes.status} ${errText}`,
      );
    }
    release = await createRes.json();
    console.log(`✓ Created GitHub release ${tag} (id: ${release.id})`);
  }

  // 2. Prepare files to upload
  const appDir = path.join(ROOT_DIR, "App");
  const rawExeName = `KAMBAM FINANCE-Setup-${version}.exe`;
  const uploadExeName = `KAMBAM.FINANCE-Setup-${version}.exe`;
  const exePath = path.join(appDir, rawExeName);
  const blockmapPath = path.join(appDir, `${rawExeName}.blockmap`);

  if (!fs.existsSync(exePath)) {
    throw new Error(
      `Installer executable not found at ${exePath}. Run build first!`,
    );
  }

  const exeStats = fs.statSync(exePath);
  console.log(
    `Found installer: ${rawExeName} (${(exeStats.size / (1024 * 1024)).toFixed(1)} MB)`,
  );

  // Generate latest.yml for auto-updater
  const sha512 = computeSha512(exePath);
  const latestYmlContent = [
    `version: ${version}`,
    `files:`,
    `  - url: ${uploadExeName}`,
    `    sha512: ${sha512}`,
    `    size: ${exeStats.size}`,
    `path: ${uploadExeName}`,
    `sha512: ${sha512}`,
    `releaseDate: '${new Date().toISOString()}'`,
    "",
  ].join("\n");
  const latestYmlPath = path.join(appDir, "latest.yml");
  fs.writeFileSync(latestYmlPath, latestYmlContent, "utf-8");

  const filesToUpload = [
    {
      localPath: exePath,
      name: uploadExeName,
      contentType: "application/vnd.microsoft.portable-executable",
    },
    {
      localPath: fs.existsSync(blockmapPath) ? blockmapPath : null,
      name: `${uploadExeName}.blockmap`,
      contentType: "application/octet-stream",
    },
    {
      localPath: latestYmlPath,
      name: "latest.yml",
      contentType: "text/yaml",
    },
  ].filter((f) => f.localPath && fs.existsSync(f.localPath));

  // 3. Delete any conflicting pre-existing assets with identical names
  for (const asset of release.assets || []) {
    if (filesToUpload.some((f) => f.name === asset.name)) {
      console.log(`Removing old asset ${asset.name} (id: ${asset.id})...`);
      await fetch(
        `https://api.github.com/repos/${owner}/${repo}/releases/assets/${asset.id}`,
        {
          method: "DELETE",
          headers,
        },
      );
    }
  }

  // 4. Upload each asset to uploads.github.com using streaming
  for (const item of filesToUpload) {
    const fileStats = fs.statSync(item.localPath);
    console.log(
      `\nUploading ${item.name} (${(fileStats.size / 1024).toFixed(1)} KB)...`,
    );

    const uploadUrl = `https://uploads.github.com/repos/${owner}/${repo}/releases/${release.id}/assets?name=${encodeURIComponent(item.name)}`;
    const uploadedAsset = await uploadFileStream(
      uploadUrl,
      item.localPath,
      item.contentType,
      token,
    );
    console.log(
      `✓ Uploaded ${item.name} (Download: ${uploadedAsset.browser_download_url || "Done"})`,
    );
  }

  console.log(`\n========================================================`);
  console.log(`🎉 Successfully released and uploaded KAMBAM FINANCE ${tag}!`);
  console.log(
    `GitHub Release: https://github.com/${owner}/${repo}/releases/tag/${tag}`,
  );
  console.log(`========================================================\n`);
}

main().catch((err) => {
  console.error("❌ Release upload error:", err.message);
  process.exit(1);
});
