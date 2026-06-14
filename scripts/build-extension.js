import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import dotenv from "dotenv";

// Load environment variables from .env files
dotenv.config();
dotenv.config({ path: ".env.local" });

const REQUIRED_VARS = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
];

const missingVars = REQUIRED_VARS.filter((v) => !process.env[v]);

if (missingVars.length > 0) {
  console.error("❌ ERROR: Missing required Firebase environment variables:");
  missingVars.forEach((v) => console.error(`   - ${v}`));
  console.error("\nPlease define these in a .env.local file or environment before building.");
  process.exit(1);
}

const sourceDir = path.resolve("extension");
const targetDir = path.resolve("dist-extension");

console.log("🚀 Starting extension compilation...");
console.log(`Source: ${sourceDir}`);
console.log(`Target: ${targetDir}`);

// Ensure target directory exists and is clean
if (fs.existsSync(targetDir)) {
  fs.rmSync(targetDir, { recursive: true, force: true });
}
fs.mkdirSync(targetDir, { recursive: true });

// Copy all extension files to target directory
const files = fs.readdirSync(sourceDir);
for (const file of files) {
  const srcFile = path.join(sourceDir, file);
  const destFile = path.join(targetDir, file);
  if (fs.statSync(srcFile).isFile()) {
    fs.copyFileSync(srcFile, destFile);
  }
}

// Replace placeholders in the target background.js
const backgroundPath = path.join(targetDir, "background.js");
let backgroundContent = fs.readFileSync(backgroundPath, "utf8");

REQUIRED_VARS.forEach((v) => {
  const placeholder = `YOUR_FIREBASE_${v.replace("VITE_FIREBASE_", "")}`;
  const value = process.env[v];
  backgroundContent = backgroundContent.replaceAll(placeholder, value);
});

fs.writeFileSync(backgroundPath, backgroundContent, "utf8");
console.log("✅ Successfully injected environment variables into background.js");

// Run web-ext build targeting the compiled directory
try {
  console.log("📦 Packaging extension with web-ext...");
  execSync("npx web-ext build --source-dir dist-extension --overwrite-dest", { stdio: "inherit" });
  console.log("🎉 Extension compiled and packaged successfully!");
} catch (error) {
  console.error("❌ Failed to package extension with web-ext:", error.message);
  process.exit(1);
}
