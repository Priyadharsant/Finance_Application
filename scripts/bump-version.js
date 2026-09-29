#!/usr/bin/env node

/**
 * Unified Version Bumping Script for FinFlow (Finance Application)
 *
 * Usage:
 *   node scripts/bump-version.js patch        (1.3.0 -> 1.3.1)
 *   node scripts/bump-version.js minor        (1.3.0 -> 1.4.0)
 *   node scripts/bump-version.js major        (1.3.0 -> 2.0.0)
 *   node scripts/bump-version.js 1.4.2        (Explicit version)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import readline from "readline";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");

const FILES = {
  rootPackage: path.join(ROOT_DIR, "package.json"),
  frontendPackage: path.join(ROOT_DIR, "Frontend", "package.json"),
  backendPackage: path.join(ROOT_DIR, "Backend", "package.json"),
  frontendVersionJs: path.join(ROOT_DIR, "Frontend", "src", "version.js"),
  backendVersionRoute: path.join(ROOT_DIR, "Backend", "src", "routes", "versionRoutes.js"),
  backendEnv: path.join(ROOT_DIR, "Backend", ".env"),
  backendEnvExample: path.join(ROOT_DIR, "Backend", ".env.example"),
};

function readJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function writeJson(filePath, data, indent = 2) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, indent) + "\n", "utf-8");
}

function getCurrentVersion() {
  const rootPkg = readJson(FILES.rootPackage);
  if (rootPkg && rootPkg.version) return rootPkg.version;
  const fePkg = readJson(FILES.frontendPackage);
  if (fePkg && fePkg.version) return fePkg.version;
  return "1.0.0";
}

function computeNextVersion(current, bumpType) {
  const match = current.match(/^(\d+)\.(\d+)\.(\d+)(.*)$/);
  if (!match) {
    throw new Error(`Current version "${current}" does not conform to semantic versioning (X.Y.Z)`);
  }
  let major = parseInt(match[1], 10);
  let minor = parseInt(match[2], 10);
  let patch = parseInt(match[3], 10);

  const type = bumpType.toLowerCase();
  if (type === "patch") {
    patch += 1;
    return `${major}.${minor}.${patch}`;
  } else if (type === "minor") {
    minor += 1;
    patch = 0;
    return `${major}.${minor}.${patch}`;
  } else if (type === "major") {
    major += 1;
    minor = 0;
    patch = 0;
    return `${major}.${minor}.${patch}`;
  } else if (/^\d+\.\d+\.\d+/.test(bumpType)) {
    return bumpType.trim().replace(/^v/i, "");
  } else {
    throw new Error(`Invalid bump type or version: "${bumpType}". Use 'patch', 'minor', 'major', or a valid semver string like '1.4.0'.`);
  }
}

function getTodayDateString() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function updateFile(filePath, updater) {
  if (!fs.existsSync(filePath)) return false;
  const content = fs.readFileSync(filePath, "utf-8");
  const updated = updater(content);
  if (content !== updated) {
    fs.writeFileSync(filePath, updated, "utf-8");
    return true;
  }
  return false;
}

async function promptForVersion(current) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const nextPatch = computeNextVersion(current, "patch");
  const nextMinor = computeNextVersion(current, "minor");
  const nextMajor = computeNextVersion(current, "major");

  console.log("\n========================================================");
  console.log(` FinFlow Version Manager (Current: v${current})`);
  console.log("========================================================");
  console.log(` 1) patch -> v${nextPatch}`);
  console.log(` 2) minor -> v${nextMinor}`);
  console.log(` 3) major -> v${nextMajor}`);
  console.log(` 4) Enter custom version`);
  console.log("========================================================\n");

  return new Promise((resolve) => {
    rl.question("Select an option [1-4] or enter version: ", (answer) => {
      rl.close();
      const trimmed = answer.trim();
      if (trimmed === "1" || trimmed.toLowerCase() === "patch") resolve(nextPatch);
      else if (trimmed === "2" || trimmed.toLowerCase() === "minor") resolve(nextMinor);
      else if (trimmed === "3" || trimmed.toLowerCase() === "major") resolve(nextMajor);
      else if (trimmed === "4") {
        const rlCustom = readline.createInterface({ input: process.stdin, output: process.stdout });
        rlCustom.question("Enter custom semver (e.g. 1.3.1): ", (customVer) => {
          rlCustom.close();
          resolve(customVer.trim().replace(/^v/i, ""));
        });
      } else if (/^\d+\.\d+\.\d+/.test(trimmed)) {
        resolve(trimmed.replace(/^v/i, ""));
      } else {
        console.error("Cancelled or invalid input.");
        process.exit(1);
      }
    });
  });
}

async function main() {
  const currentVersion = getCurrentVersion();
  let targetArg = process.argv[2];

  let nextVersion = "";
  if (!targetArg) {
    if (!process.stdin.isTTY) {
      console.log(`Current version: ${currentVersion}`);
      console.log("Usage: node scripts/bump-version.js [patch | minor | major | <version>]");
      process.exit(0);
    }
    nextVersion = await promptForVersion(currentVersion);
  } else {
    nextVersion = computeNextVersion(currentVersion, targetArg);
  }

  if (!/^\d+\.\d+\.\d+/.test(nextVersion)) {
    console.error(`Error: "${nextVersion}" is not a valid semantic version.`);
    process.exit(1);
  }

  const today = getTodayDateString();
  const modifiedFiles = [];

  // 1. Root package.json
  if (fs.existsSync(FILES.rootPackage)) {
    const pkg = readJson(FILES.rootPackage);
    pkg.version = nextVersion;
    writeJson(FILES.rootPackage, pkg, 2);
    modifiedFiles.push("package.json (root)");
  }

  // 2. Frontend package.json
  if (fs.existsSync(FILES.frontendPackage)) {
    const pkg = readJson(FILES.frontendPackage);
    pkg.version = nextVersion;
    writeJson(FILES.frontendPackage, pkg, 2);
    modifiedFiles.push("Frontend/package.json");
  }

  // 3. Backend package.json
  if (fs.existsSync(FILES.backendPackage)) {
    const pkg = readJson(FILES.backendPackage);
    pkg.version = nextVersion;
    writeJson(FILES.backendPackage, pkg, 4);
    modifiedFiles.push("Backend/package.json");
  }

  // 4. Frontend/src/version.js (Build date)
  updateFile(FILES.frontendVersionJs, (content) => {
    let res = content;
    // Update build date
    res = res.replace(/export const APP_BUILD_DATE = "[^"]*";/, `export const APP_BUILD_DATE = "${today}";`);
    // If APP_VERSION is still a literal string, sync it too
    res = res.replace(/export const APP_VERSION = "[^"]*";/, `export const APP_VERSION = "${nextVersion}";`);
    return res;
  });
  modifiedFiles.push("Frontend/src/version.js");

  // 5. Backend/src/routes/versionRoutes.js (releaseDate)
  updateFile(FILES.backendVersionRoute, (content) => {
    return content.replace(/releaseDate: "[^"]*"/, `releaseDate: "${today}"`);
  });
  modifiedFiles.push("Backend/src/routes/versionRoutes.js");

  // 6. Backend/.env and Backend/.env.example
  for (const envPath of [FILES.backendEnv, FILES.backendEnvExample]) {
    if (fs.existsSync(envPath)) {
      const changed = updateFile(envPath, (content) => {
        return content.replace(/^LATEST_APP_VERSION=.*$/m, `LATEST_APP_VERSION=${nextVersion}`);
      });
      if (changed) {
        modifiedFiles.push(path.relative(ROOT_DIR, envPath));
      }
    }
  }

  console.log("\n========================================================");
  console.log(` Successfully bumped version: v${currentVersion} -> v${nextVersion}`);
  console.log(` Release Date: ${today}`);
  console.log("========================================================");
  console.log("Updated files:");
  modifiedFiles.forEach((file) => console.log(`  ✓ ${file}`));
  console.log("--------------------------------------------------------");
  console.log("Next steps:");
  console.log(`  1. Build Installer : npm run build:exe`);
  console.log(`  2. Commit changes  : git commit -am "chore: bump version to v${nextVersion}"`);
  console.log(`  3. Tag release     : git tag v${nextVersion}`);
  console.log("========================================================\n");
}

main().catch((err) => {
  console.error("Error updating version:", err);
  process.exit(1);
});
