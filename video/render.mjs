// Render the pitch video + thumbnail.
// Usage:
//   node video/render.mjs            # full render + thumbnail
//   node video/render.mjs --preview  # fast half-res proxy render

import { spawnSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REMOTION_DIR = path.join(__dirname, "remotion");
const OUT_DIR = path.join(__dirname, "out");

const CHROME =
  process.env.CHROME_PATH ||
  [
    path.join(
      process.env.HOME || "",
      ".cache/puppeteer/chrome-headless-shell/linux-153.0.8010.36/chrome-headless-shell-linux64/chrome-headless-shell",
    ),
    "/usr/bin/chromium-browser",
  ].find((p) => fs.existsSync(p)) || "";

const remotion = (args) => {
  const res = spawnSync(
    process.execPath,
    [path.join(__dirname, "node_modules", ".bin", "remotion"), ...args],
    { stdio: "inherit", cwd: REMOTION_DIR, env: { ...process.env, CHROME_PATH: CHROME } },
  );
  if (res.status !== 0) process.exit(res.status ?? 1);
};

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(path.join(__dirname, "public", "brand"), { recursive: true });

const PUBLIC_DIR = path.join(REMOTION_DIR, "public");

const preview = process.argv.includes("--preview");

const bundleArgs = [
  path.join(REMOTION_DIR, "index.js"),
  "--bundle-cache-dir",
  path.join(__dirname, ".bundle-cache"),
];

if (preview) {
  remotion([
    "render", ...bundleArgs, "PitchVideo",
    path.join(OUT_DIR, "pitch-preview.mp4"),
    "--public-dir", PUBLIC_DIR, "--scale", "0.5", "--crf", "28", "--concurrency", "2", "--jpeg-quality", "80",
  ]);
  console.log("Preview done: video/out/pitch-preview.mp4");
  process.exit(0);
}

remotion([
  "render", ...bundleArgs, "PitchVideo",
  path.join(OUT_DIR, "pitch.mp4"),
  "--public-dir", PUBLIC_DIR, "--crf", "17", "--concurrency", "2", "--jpeg-quality", "90",
]);

// Thumbnail: hero shot mid-scene 4 (account scan with score visible)
// Scene starts: hero=0, then each scene consumes (len − 0.5s overlap).
const overlap = 0.5;
const accountStart = 12.84 + (15.72 - overlap) + (13.37 - overlap);

remotion([
  "still", ...bundleArgs, "PitchVideo",
  path.join(__dirname, "public", "brand", "thumbnail.png"),
  "--frame", String(Math.round((accountStart + 8) * 30)),
  "--public-dir", PUBLIC_DIR,
]);

console.log("Full render done: video/out/pitch.mp4");
