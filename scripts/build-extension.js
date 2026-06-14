import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const configPath = path.resolve("firebase-config.json");

// Fail-fast if firebase-config.json is missing
if (!fs.existsSync(configPath)) {
  console.error("❌ ERROR: Missing 'firebase-config.json' in the project root.");
  console.error("Please create it using 'firebase-config.example.json' as a template.");
  console.error("For CI environments, make sure the FIREBASE_CONFIG_JSON secret is set.");
  process.exit(1);
}

// Read and validate config keys to prevent placeholder check failures
try {
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  const required = ["apiKey", "projectId", "authDomain", "appId"];
  const missing = required.filter((k) => !config[k] || config[k].startsWith("YOUR_FIREBASE_"));
  if (missing.length > 0) {
    console.error(`❌ ERROR: Invalid Firebase configuration. Missing or placeholder keys: ${missing.join(", ")}`);
    process.exit(1);
  }
} catch (err) {
  console.error("❌ ERROR: Failed to parse 'firebase-config.json' as valid JSON:", err.message);
  process.exit(1);
}

const targetDir = path.resolve("dist-extension");

console.log("🚀 Bundling extension files via Vite...");
try {
  execSync("npx vite build --config vite-extension.config.ts", { stdio: "inherit" });
} catch (error) {
  console.error("❌ Vite compilation failed:", error.message);
  process.exit(1);
}

console.log("📂 Copying static assets...");
try {
  // Copy manifest, content script, and cryptographic helpers
  fs.copyFileSync(path.resolve("extension/manifest.json"), path.join(targetDir, "manifest.json"));
  fs.copyFileSync(path.resolve("extension/content.js"), path.join(targetDir, "content.js"));
  fs.copyFileSync(path.resolve("extension/crypto.js"), path.join(targetDir, "crypto.js"));

  // Copy assets if they exist
  const assetsSrc = path.resolve("assets");
  if (fs.existsSync(assetsSrc)) {
    fs.cpSync(assetsSrc, path.join(targetDir, "assets"), { recursive: true });
  }

  // Copy firebase-config.json into the packaged extension
  fs.copyFileSync(configPath, path.join(targetDir, "firebase-config.json"));
  
  console.log("✅ Static assets copied successfully.");
} catch (error) {
  console.error("❌ Failed to copy static assets:", error.message);
  process.exit(1);
}

// Package extension with web-ext
try {
  console.log("📦 Packaging extension with web-ext...");
  execSync("npx web-ext build --source-dir dist-extension --overwrite-dest", { stdio: "inherit" });
  console.log("🎉 Extension compiled and packaged successfully!");
} catch (error) {
  console.error("❌ Failed to package extension with web-ext:", error.message);
  process.exit(1);
}
