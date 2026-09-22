// Create GitHub release and upload the pitch video asset.
import fs from "fs";

const REPO = process.env.GITHUB_REPOSITORY || "Stellar-Wallet-Scanner/stellar-wallet-scanner";
const TOKEN = process.env.GITHUB_TOKEN;
const FILE = "assets/stellar-wallet-scanner-pitch.mp4";
const TAG = "pitch-video";
const NAME = "Stellar Wallet Scanner — Product Pitch Video";

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
  // 1. find or create release with the tag
  let rel = await api(`/repos/${REPO}/releases/tags/${TAG}`);
  if (rel.status === 404) {
    rel = await api(`/repos/${REPO}/releases`, {
      method: "POST",
      body: JSON.stringify({
        tag_name: TAG,
        target_commitish: "main",
        name: NAME,
        body:
          "🎬 **Product pitch video (~2 minutes)** — the official presentation of the Stellar Wallet Scanner project.\n\n" +
          "- Problem → Solution → Live features → On-chain registry → Architecture → Value\n" +
          "- Narrated, with live captures from the production Vercel deployment\n\n" +
          "▶ Watch: download or stream `stellar-wallet-scanner-pitch.mp4` below, or view the embedded section in the README.",
        draft: false,
        prerelease: false,
      }),
    });
    if (!rel.ok) {
      console.error("release create failed", rel.status, await rel.text());
      process.exit(1);
    }
    console.log("[release] created");
  } else if (!rel.ok) {
    console.error("release lookup failed", rel.status);
    process.exit(1);
  }
  const relJson = await rel.json();
  console.log("[release] id", relJson.id, "url", relJson.html_url);

  // 2. upload asset (replace if exists)
  const existing = relJson.assets || [];
  for (const a of existing) {
    if (a.name === "stellar-wallet-scanner-pitch.mp4") {
      const del = await api(`/repos/${REPO}/releases/assets/${a.id}`, { method: "DELETE" });
      console.log("[release] deleted old asset", a.id, del.status);
    }
  }

  const buf = fs.readFileSync(FILE);
  const up = await fetch(relJson.upload_url.replace("{?name,label}", "") + "?name=stellar-wallet-scanner-pitch.mp4", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "video/mp4",
      "Content-Length": buf.length,
    },
    body: buf,
  });
  if (!up.ok) {
    console.error("upload failed", up.status, await up.text());
    process.exit(1);
  }
  const asset = await up.json();
  console.log("[asset]", asset.browser_download_url, asset.size, "bytes");
})().catch((e) => {
  console.error("FATAL", e.message);
  process.exit(1);
});
