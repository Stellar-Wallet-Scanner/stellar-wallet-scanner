// Add chapter timestamps to the pitch-video release notes.
// GitHub renders matching timestamps in the release body as clickable
// chapters in the attached video player.
// Usage: node scripts/add-chapters.mjs
import fs from "fs";

const REPO = process.env.GITHUB_REPOSITORY || "Stellar-Wallet-Scanner/stellar-wallet-scanner";
const TOKEN = process.env.GITHUB_TOKEN;
const TAG = "pitch-video";

const AUDIO = "video-assets/audio";
const PAD = 0.7;   // must match build-video.mjs
const XFADE = 0.5; // must match build-video.mjs

const TITLES = [
  "Hook — Understand Stellar in seconds",
  "The Problem — Transparent chain, opaque data",
  "The Solution — One address in, full report out",
  "Account Scanner — Live balance, signers & security score",
  "Contract Scanner — WASM, functions & metadata decoded",
  "Live Workflow — Paste, scan, report",
  "On-chain Registry — ScannerRegistry on Testnet",
  "Architecture — React · Rust · Soroban · Vercel",
  "The Contract — Pure Rust, 1.2 KB WASM, 3 tests",
  "Why It's Different — Security-first by design",
  "Responsive — Desktop, tablet, mobile",
  "Try It Live — Links & credits",
];

// Recompute scene starts exactly like build-video.mjs
const starts = [0];
let t = 0;
for (let i = 0; i < TITLES.length; i++) {
  const n = String(i + 1).padStart(2, "0");
  const { dur } = JSON.parse(fs.readFileSync(`${AUDIO}/scene-${n}.json`, "utf8"));
  t += Math.max(5, dur + PAD);
  if (i < TITLES.length - 1) starts.push(t - XFADE);
}

const fmt = (s) => {
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
};

const chapters = TITLES.map((title, i) => `${fmt(starts[i])} ${title}`).join("\n");

const body =
  "🎬 **Product pitch video (~2 minutes)** — the official presentation of the Stellar Wallet Scanner project.\n\n" +
  "- Problem → Solution → Live features → On-chain registry → Architecture → Value\n" +
  "- Narrated, with live captures from the production Vercel deployment\n\n" +
  "▶ Watch: download or stream `stellar-wallet-scanner-pitch.mp4` below, or view the embedded section in the README.\n\n" +
  "## ⏱ Chapters\n\n" +
  chapters +
  "\n";

const api = (path, opts = {}) =>
  fetch(`https://api.github.com${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(opts.headers || {}),
    },
  });

(async () => {
  const rel = await api(`/repos/${REPO}/releases/tags/${TAG}`);
  if (!rel.ok) {
    console.error("release lookup failed", rel.status);
    process.exit(1);
  }
  const relJson = await rel.json();
  const patch = await api(`/repos/${REPO}/releases/${relJson.id}`, {
    method: "PATCH",
    body: JSON.stringify({ body }),
  });
  if (!patch.ok) {
    console.error("patch failed", patch.status, await patch.text());
    process.exit(1);
  }
  console.log("[chapters] release notes updated:", relJson.html_url);
  console.log(chapters);
})().catch((e) => {
  console.error("FATAL", e.message);
  process.exit(1);
});
