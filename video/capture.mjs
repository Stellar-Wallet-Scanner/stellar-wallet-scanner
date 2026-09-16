// Capture rig: drives the real Stellar Scan UI end-to-end and records every
// scene for the pitch video composer.
//
// Outputs:
//   video/raw/<scene>.mp4   — CDP screencast footage encoded at 30fps
//   video/raw/stills/*.png  — high-res screenshots for still scenes / callouts
//   video/raw/scenes.json   — manifest of captured scenes
//
// Usage: node video/capture.mjs   (expects dev servers; use with-servers.sh)

import puppeteer from "puppeteer";
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAW_DIR = path.join(__dirname, "raw");
const STILLS_DIR = path.join(RAW_DIR, "stills");
const LOCAL_URL = process.env.LOCAL_URL || "http://localhost:5173";
const VERCEL_URL = "https://stellar-wallet-scanner.vercel.app";

const WIDTH = 1600;
const HEIGHT = 1000;

const ACCOUNT_ADDRESS =
  "GBVVPXTBPYEOYQJHIIVIOUBFXXSHYSP6GN2XZN56L7VAX7ZNT66WDFSU";
const CONTRACT_ADDRESS =
  "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Poll the real UI until a Soroban contract becomes scannable. Fresh Testnet
// contracts surface on RPC after ~1 min of indexing lag and expire minutes
// later, so recording must start right after this returns true.
async function scanContractScannable(page, contractAddress, { timeoutMs = 180_000 } = {}) {
  const deadline = Date.now() + timeoutMs;
  let attempt = 0;
  while (Date.now() < deadline) {
    attempt += 1;
    await page.reload({ waitUntil: "networkidle2", timeout: 45000 }).catch(() => {});
    await ensureKeepalive(page);
    await sleep(1200);
    const input = await page.$('input[placeholder*="Enter G..."]');
    if (!input) { await sleep(4000); continue; }
    await input.click({ clickCount: 3 });
    await typeHuman(input, contractAddress);
    await sleep(300);
    await page.evaluate(() => {
      [...document.querySelectorAll("button")]
        .find((b) => (b.textContent || "").trim().startsWith("Scan Wallet"))?.click();
    });
    const ok = await page
      .waitForFunction(
        () =>
          !!document.querySelector(".scanner-result-header") ||
          !!document.querySelector(".scanner-error"),
        { timeout: 25000, polling: 250 },
      )
      .then(() => true)
      .catch(() => false);
    if (!ok) { await sleep(2000); continue; }
    const state = await page.evaluate(() => ({
      hasResult: !!document.querySelector(".scanner-result-header"),
      hasError: !!document.querySelector(".scanner-error"),
    }));
    console.log(`  scannability probe #${attempt}: ${state.hasResult ? "RESULT ✅" : "error ⏳"}`);
    if (state.hasResult && !state.hasError) return true;
    await sleep(8000);
  }
  return false;
}

// ---------------------------------------------------------------
// Screencast recorder: buffers JPEG frames with CDP timestamps,
// then pipes them into ffmpeg to produce a 30fps MP4 per scene.
// ---------------------------------------------------------------
class Recorder {
  constructor(client, name) {
    this.client = client;
    this.name = name;
    this.frames = [];
    this.handler = null;
  }

  start() {
    this.frames = [];

    // Attach the listener BEFORE startScreencast so no early frames are lost.
    this.handler = (event) => {
      this.frames.push({
        data: Buffer.from(event.data, "base64"),
        at: event.metadata.timestamp,
      });
      this.client
        .send("Page.screencastFrameAck", { sessionId: event.sessionId })
        .catch(() => {});
    };

    this.client.on("Page.screencastFrame", this.handler);
    return this.client.send("Page.startScreencast", {
      format: "jpeg",
      quality: 90,
      maxWidth: WIDTH,
      maxHeight: HEIGHT,
      everyNthFrame: 1,
    });
  }

  async stopAndEncode() {
    await this.client.send("Page.stopScreencast");
    this.client.off("Page.screencastFrame", this.handler);
    await sleep(350);

    if (this.frames.length < 2) {
      throw new Error(`Scene ${this.name}: captured only ${this.frames.length} frames`);
    }

    // Normalize timestamps to seconds from scene start; enforce >= 1/30s gaps.
    // Also cap any single frame hold at 0.5s: CDP screencast stalls while the
    // renderer is busy (typing, network scans) and raw wall-clock gaps would
    // otherwise become multi-minute freeze frames in the concat encode.
    const MAX_HOLD = 0.5;
    const t0 = this.frames[0].at;
    let last = -1;
    const times = this.frames.map((f, i) => {
      let t = f.at - t0;
      if (i === 0) t = 0;
      if (t <= last) t = last + 1 / 30;
      if (t - last > MAX_HOLD) t = last + MAX_HOLD;
      last = t;
      return t;
    });

    const framesDir = path.join(RAW_DIR, "frames", this.name);
    await fs.mkdir(framesDir, { recursive: true });

    const framesFile = (i) =>
      path.join(framesDir, `f${String(i).padStart(5, "0")}.jpg`);

    for (let i = 0; i < this.frames.length; i += 1) {
      await fs.writeFile(framesFile(i), this.frames[i].data);
    }

    // concat demuxer `duration` = how long each file is SHOWN, so it must be
    // the delta to the next frame — not the absolute timestamp. (Absolute
    // values silently produce a sum-of-timestamps, multi-minute video.)
    const listPath = path.join(framesDir, "list.txt");
    const lines = [];

    for (let i = 0; i < this.frames.length - 1; i += 1) {
      lines.push(
        `file '${framesFile(i)}'\nduration ${(times[i + 1] - times[i]).toFixed(4)}`,
      );
    }
    lines.push(`file '${framesFile(this.frames.length - 1)}'`);

    await fs.writeFile(listPath, lines.concat("").join("\n"));

    const vf = `scale=${WIDTH}:${HEIGHT},fps=30,format=yuv420p`;
    const encode = (outPath) =>
      spawnSync(
        "ffmpeg",
        [
          "-y", "-nostdin", "-loglevel", "error",
          "-f", "concat", "-safe", "0", "-i", listPath,
          "-vf", vf,
          "-c:v", "libx264",
          "-preset", "medium",
          "-crf", "19",
          "-movflags", "+faststart",
          outPath,
        ],
        { encoding: "utf8", maxBuffer: 16 * 1024 * 1024, timeout: 120000 },
      );

    const outPath = path.join(RAW_DIR, `${this.name}.mp4`);
    let result = encode(outPath);

    if (result.status !== 0 || result.error) {
      // One retry with a faster preset — spawn/IO flakiness is transient.
      console.warn(
        `${this.name}: encode failed (status=${result.status} err=${result.error || ""} stderr=${(result.stderr || "").slice(0, 400)}), retrying`,
      );
      await sleep(1200);
      result = encode(outPath);
    }

    if (result.status !== 0 || result.error) {
      throw new Error(
        `ffmpeg failed for ${this.name}: status=${result.status} signal=${result.signal} err=${result.error} stderr=${result.stderr}`,
      );
    }

    console.log(
      `${this.name}: ${this.frames.length} frames, ${times[times.length - 1].toFixed(1)}s -> ${path.basename(outPath)}`,
    );

    this.frames = [];
    return outPath;
  }
}

// Constant compositor damage: a 1px black dot sliding near the top edge.
// Invisible on the dark UI, but forces screencast frames to flow.
// Must be (re-)injected AFTER every navigation — styles do not survive loads.
async function ensureKeepalive(page) {
  await page.addStyleTag({
    content: `
      @keyframes __keepalive { from { transform: translateX(0); } to { transform: translateX(40px); } }
      body::after {
        content: ""; position: fixed; left: 0; top: 0; width: 1px; height: 1px;
        background: #000; animation: __keepalive 0.12s linear infinite alternate;
      }
    `,
  });
}

async function newPage(browser) {
  const page = await browser.newPage();
  const client = await page.createCDPSession();

  await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 1 });

  return { page, client };
}

function typeHuman(el, text) {
  return el.type(text, { delay: 22 + Math.floor(Math.random() * 24) });
}

// Click a sidebar nav item by its exact label; wait for a marker to appear.
async function navigate(page, label, waitMarker) {
  const clicked = await page.evaluate((label) => {
    const items = [...document.querySelectorAll("button, a")]
      .filter((el) => (el.textContent || "").trim() === label);
    items[items.length - 1]?.click();
    return items.length > 0;
  }, label);

  if (!clicked) throw new Error(`Nav item not found: ${label}`);

  if (waitMarker) {
    await page.waitForFunction(
      (marker) => document.body.innerText.toLowerCase().includes(marker.toLowerCase()),
      { timeout: 20000, polling: 200 },
      waitMarker,
    );
  }
  await sleep(900);
}

// ---------------------------------------------------------------
// Synthetic stills: architecture diagram + code editor, rendered
// as styled HTML in the same browser for a consistent look.
// ---------------------------------------------------------------
async function shootHtmlStill(page, name, html) {
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
    html, body { margin: 0; }
    body {
      width: 1600px; height: 1000px; overflow: hidden; display: flex;
      align-items: center; justify-content: center; background: #070a14;
      font-family: system-ui, sans-serif;
    }
  </style></head><body>${html}</body></html>`, { waitUntil: "load" });
  await sleep(400);
  await page.screenshot({ path: path.join(STILLS_DIR, name) });
  console.log(`still: ${name}`);
}

const DIAGRAM_HTML = `
<div style="width:1480px; padding:50px 60px; border-radius:28px; background:linear-gradient(160deg,#0b1022 0%,#0e1430 60%,#101a3f 100%); border:1px solid rgba(124,92,255,0.25); box-shadow:0 40px 120px rgba(0,0,0,0.55);">
  <div style="font-size:15px; letter-spacing:0.35em; color:#8b93b8; font-weight:700; margin-bottom:34px;">ARCHITECTURE — READ-ONLY BY DESIGN</div>
  <div style="display:flex; align-items:center; gap:0;">
    <div style="flex:1.1;">
      <div style="border-radius:20px; padding:26px 28px; background:rgba(124,92,255,0.12); border:1px solid rgba(124,92,255,0.45);">
        <div style="font-size:26px; font-weight:800; color:#eef0ff;">Frontend</div>
        <div style="font-size:17px; color:#a9b1d6; margin-top:10px; line-height:1.5;">React + Vite<br>Tailwind CSS<br>Lucide icons</div>
      </div>
    </div>
    <div style="width:90px; text-align:center; color:#7c5cff; font-size:30px; font-weight:800;">→</div>
    <div style="flex:1.1;">
      <div style="border-radius:20px; padding:26px 28px; background:rgba(34,211,238,0.08); border:1px solid rgba(34,211,238,0.4);">
        <div style="font-size:26px; font-weight:800; color:#eef0ff;">Rust Backend</div>
        <div style="font-size:17px; color:#a9b1d6; margin-top:10px; line-height:1.5;">Axum API<br>Auto-fund logic<br>No keys stored</div>
      </div>
    </div>
    <div style="width:90px; text-align:center; color:#7c5cff; font-size:30px; font-weight:800;">→</div>
    <div style="flex:1.3;">
      <div style="border-radius:20px; padding:26px 28px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.18);">
        <div style="font-size:26px; font-weight:800; color:#eef0ff;">Stellar Testnet</div>
        <div style="font-size:17px; color:#a9b1d6; margin-top:10px; line-height:1.5;">Horizon API<br>Soroban RPC<br>WASM + XDR</div>
      </div>
    </div>
  </div>
  <div style="display:flex; gap:16px; margin-top:36px;">
    ${["Stellar SDK", "Soroban", "Stellar XDR", "Rust / Axum", "React 19", "Vite"].map((t) => `
      <div style="padding:10px 18px; border-radius:999px; border:1px solid rgba(124,92,255,0.4); color:#c9c2ff; font-size:16px; font-weight:700; background:rgba(124,92,255,0.08);">${t}</div>
    `).join("")}
  </div>
  <div style="margin-top:34px; display:flex; align-items:center; gap:14px;">
    <div style="width:12px; height:12px; border-radius:50%; background:#22d3ee; box-shadow:0 0 18px #22d3ee;"></div>
    <div style="font-size:19px; color:#8b93b8;">No wallet connection · No private keys · No transaction signing · History stays in your browser</div>
  </div>
</div>`;

const CODE_HTML = `
<div style="width:1360px; border-radius:22px; overflow:hidden; border:1px solid rgba(124,92,255,0.3); box-shadow:0 40px 120px rgba(0,0,0,0.6); background:#0d1117;">
  <div style="display:flex; align-items:center; gap:10px; padding:16px 22px; background:#11151f; border-bottom:1px solid rgba(255,255,255,0.07);">
    <div style="width:13px; height:13px; border-radius:50%; background:#ff5f57;"></div>
    <div style="width:13px; height:13px; border-radius:50%; background:#febc2e;"></div>
    <div style="width:13px; height:13px; border-radius:50%; background:#28c840;"></div>
    <div style="margin-left:16px; font-size:16px; color:#8b93b8;">src/services/stellar.js — read-only analysis core</div>
  </div>
  <pre style="margin:0; padding:30px 34px; font-size:19.5px; line-height:1.75; font-family:'SF Mono','Cascadia Code',Menlo,Consolas,monospace; color:#c9d1d9;"><span style="color:#ff7b72;">import</span> { Horizon, SorobanRpc, <span style="color:#79c0ff;">Keypair</span> } <span style="color:#ff7b72;">from</span> <span style="color:#a5d6ff;">"@stellar/stellar-sdk"</span>;

<span style="color:#8b949e;">// Scan a Soroban contract — nothing but public chain data.</span>
<span style="color:#ff7b72;">export async function</span> <span style="color:#d2a8ff;">scanContract</span>(contractId) {
  <span style="color:#ff7b72;">const</span> contract = <span style="color:#ff7b72;">await</span> rpc.<span style="color:#d2a8ff;">getContractWasm</span>(contractId);
  <span style="color:#ff7b72;">const</span> exports = <span style="color:#d2a8ff;">listExportedFunctions</span>(contract.wasm);

  <span style="color:#ff7b72;">return</span> {
    validWasm: <span style="color:#79c0ff;">contract</span>.valid,
    wasmSize: <span style="color:#79c0ff;">contract</span>.bytes,
    functions: exports,
    <span style="color:#a5d6ff;">capabilities</span>: <span style="color:#d2a8ff;">detectCapabilities</span>(exports),
  };
}</pre>
</div>`;

// ---------------------------------------------------------------
// Scene drivers
// ---------------------------------------------------------------
async function main() {
  await fs.mkdir(STILLS_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--force-device-scale-factor=1",
      "--hide-scrollbars",
      "--mute-audio",
    ],
  });

  // Hard stop so a hung close() can never wedge the run.
  const watchdog = setTimeout(() => {
    console.error("Watchdog: capture exceeded 260s, exiting.");
    process.exit(1);
  }, 260_000).unref();

  const manifest = {};

  try {
    let { page, client } = await newPage(browser);

    page.on("framenavigated", (f) =>
      console.log(`[nav ${new Date().toISOString().slice(11, 23)}]`, f.url().slice(0, 70)),
    );

    // -------------------------------------------------------------
    // Scene A — dashboard idle motion (intro / solution B-roll)
    // -------------------------------------------------------------
    await page.goto(LOCAL_URL, { waitUntil: "networkidle2", timeout: 45000 });
    await ensureKeepalive(page);
    await sleep(1500);

    const recA = new Recorder(client, "A_intro");
    await recA.start();
    await sleep(700);
    await page.mouse.move(620, 320);
    await page.mouse.move(980, 540, { steps: 24 });
    await sleep(1800);
    await page.evaluate(() => window.scrollBy({ top: 300, behavior: "smooth" }));
    await sleep(1400);
    await page.mouse.move(760, 620, { steps: 18 });
    await sleep(1200);
    await recA.stopAndEncode();
    manifest.A_intro = true;

    // High-res stills of the clean dashboard
    await page.evaluate(() => window.scrollTo({ top: 0 }));
    await sleep(500);
    await page.screenshot({ path: path.join(STILLS_DIR, "dashboard.png") });
    console.log("still: dashboard.png");

    // -------------------------------------------------------------
    // Scene B — account scan: type, submit, watch score + findings
    // -------------------------------------------------------------
    const input = await page.$('input[placeholder*="Enter G..."]');
    if (!input) throw new Error("Scan input not found");

    const recB = new Recorder(client, "B_account_scan");
    await recB.start();
    await input.click({ clickCount: 3 });
    await typeHuman(input, ACCOUNT_ADDRESS);
    await sleep(400);

    const scanClicked = await page.evaluate(() => {
      const buttons = [...document.querySelectorAll("button")];
      const target = buttons.find((b) =>
        (b.textContent || "").trim().startsWith("Scan Wallet"),
      );
      if (!target) return false;
      target.click();
      return true;
    });

    if (!scanClicked) throw new Error("Scan Wallet button not found");

    // The result header renders only after a completed scan.
    await page.waitForFunction(
      () =>
        !!document.querySelector(".scanner-result-header") &&
        document.body.innerText.includes("Stellar Account"),
      { timeout: 60000, polling: 200 },
    );

    await sleep(1600);
    await page.mouse.move(1180, 300, { steps: 14 });
    await sleep(900);
    await recB.stopAndEncode();
    manifest.B_account_scan = true;

    await page.screenshot({ path: path.join(STILLS_DIR, "account_result.png") });
    console.log("still: account_result.png");
    await page.evaluate(() => {
      const el = [...document.querySelectorAll("*")]
        .find((n) => n.textContent === "Findings" && n.children.length === 0);
      el?.scrollIntoView({ block: "center", behavior: "instant" });
    });
    await sleep(600);
    await page.screenshot({ path: path.join(STILLS_DIR, "account_findings.png") });
    console.log("still: account_findings.png");

    // -------------------------------------------------------------
    // Scene C — contract scan on our freshly deployed demo contract
    // -------------------------------------------------------------
    // Testnet instance TTLs are short (minutes) and RPC indexing lags ~1 min,
    // so deploy a fresh copy, probe until scannable, then record immediately.
    console.log("deploying fresh demo contract for scene C…");
    const deployRes = spawnSync(process.execPath, [path.join(__dirname, "deploy-demo-contract.mjs")], {
      stdio: "inherit",
      timeout: 240_000,
    });
    if (deployRes.status !== 0) throw new Error("demo contract deploy script failed");
    const demoMeta = JSON.parse(await fs.readFile(path.join(RAW_DIR, "demo-contract.json"), "utf8"));
    const contractAddress = demoMeta.contractId;
    console.log("demo contract:", contractAddress);

    const scanReady = await scanContractScannable(page, contractAddress, { timeoutMs: 180_000 });
    if (!scanReady) throw new Error("demo contract never became scannable");

    // Fresh load so the footage starts from a clean dashboard.
    // Re-query the input: the previous element handle is stale after reload.
    await page.reload({ waitUntil: "networkidle2", timeout: 45000 });
    await ensureKeepalive(page);
    await sleep(1200);
    const contractInput = await page.$('input[placeholder*="Enter G..."]');
    if (!contractInput) throw new Error("Scan input not found after reload");

    const recC = new Recorder(client, "C_contract_scan");
    await recC.start();
    await contractInput.click({ clickCount: 3 });
    await typeHuman(contractInput, contractAddress);
    await sleep(400);

    await page.evaluate(() => {
      const buttons = [...document.querySelectorAll("button")];
      const target = buttons.find((b) =>
        (b.textContent || "").trim().startsWith("Scan Wallet"),
      );
      target?.click();
    });

    await page.waitForFunction(
      () =>
        !!document.querySelector(".scanner-result-header") &&
        document.body.innerText.includes("Soroban Smart Contract"),
      { timeout: 60000, polling: 200 },
    );

    await sleep(1500);
    await page.evaluate(() => {
      const el = [...document.querySelectorAll("*")]
        .find((n) => n.textContent === "Exported functions" && n.children.length === 0);
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
    });
    await sleep(1400);
    await recC.stopAndEncode();
    manifest.C_contract_scan = true;

    await page.evaluate(() => window.scrollTo({ top: 0 }));
    await sleep(500);
    await page.screenshot({ path: path.join(STILLS_DIR, "contract_result.png") });
    console.log("still: contract_result.png");
    await page.evaluate(() => {
      const el = [...document.querySelectorAll("*")]
        .find((n) => n.textContent === "Exported functions" && n.children.length === 0);
      el?.scrollIntoView({ block: "start", behavior: "instant" });
    });
    await sleep(600);
    await page.screenshot({ path: path.join(STILLS_DIR, "contract_functions.png") });
    console.log("still: contract_functions.png");

    // -------------------------------------------------------------
    // Scene D — history (with the two scans just recorded)
    // -------------------------------------------------------------
    await navigate(page, "Scan History", "Scan History");
    const recD = new Recorder(client, "D_history");
    await recD.start();
    await sleep(600);
    await page.evaluate(() => window.scrollBy({ top: 350, behavior: "smooth" }));
    await sleep(900);
    await page.evaluate(() => window.scrollBy({ top: 350, behavior: "smooth" }));
    await sleep(900);
    await recD.stopAndEncode();
    manifest.D_history = true;

    await page.evaluate(() => window.scrollTo({ top: 0 }));
    await sleep(400);
    await page.screenshot({ path: path.join(STILLS_DIR, "history.png") });
    console.log("still: history.png");

    // -------------------------------------------------------------
    // Scene E — analytics
    // -------------------------------------------------------------
    await navigate(page, "Security Analytics", "last 7 days");
    const recE = new Recorder(client, "E_analytics");
    await recE.start();
    await sleep(600);
    await page.evaluate(() => window.scrollBy({ top: 350, behavior: "smooth" }));
    await sleep(900);
    await page.evaluate(() => window.scrollBy({ top: 350, behavior: "smooth" }));
    await sleep(900);
    await recE.stopAndEncode();
    manifest.E_analytics = true;

    await page.evaluate(() => window.scrollTo({ top: 0 }));
    await sleep(400);
    await page.screenshot({ path: path.join(STILLS_DIR, "analytics.png") });
    console.log("still: analytics.png");

    // -------------------------------------------------------------
    // Scene F — light mode stills, then restore dark
    // -------------------------------------------------------------
    await navigate(page, "Dashboard");
    await page.evaluate(() => {
      const items = [...document.querySelectorAll("button")]
        .filter((el) => el.getAttribute("aria-label") === "Toggle theme");
      items[0]?.click();
    });
    await sleep(1000);
    await page.screenshot({ path: path.join(STILLS_DIR, "light_dashboard.png") });
    console.log("still: light_dashboard.png");
    await page.evaluate(() => {
      const items = [...document.querySelectorAll("button")]
        .filter((el) => el.getAttribute("aria-label") === "Toggle theme");
      items[0]?.click();
    });
    await sleep(600);

    // -------------------------------------------------------------
    // Synthetic stills — architecture + code
    // -------------------------------------------------------------
    await shootHtmlStill(page, "architecture.png", DIAGRAM_HTML);
    await shootHtmlStill(page, "code_editor.png", CODE_HTML);

    // -------------------------------------------------------------
    // Scene G — live Vercel deployment (idle + best-effort live scan)
    // -------------------------------------------------------------
    const vpage = await browser.newPage();
    await vpage.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 1 });
    await vpage.goto(VERCEL_URL, { waitUntil: "networkidle2", timeout: 60000 });
    await ensureKeepalive(vpage);
    await sleep(1500);

    const vclient = await vpage.createCDPSession();
    const recG = new Recorder(vclient, "G_vercel");
    await recG.start();
    await sleep(800);
    await vpage.mouse.move(620, 320);
    await vpage.mouse.move(980, 540, { steps: 24 });
    await sleep(1800);
    await recG.stopAndEncode();
    manifest.G_vercel = true;

    await vpage.screenshot({ path: path.join(STILLS_DIR, "vercel_deploy.png") });
    console.log("still: vercel_deploy.png");

    // Best-effort: run a real scan on the production deployment.
    try {
      const vInput = await vpage.$('input[placeholder*="Enter G..."]');
      if (vInput) {
        await vInput.click({ clickCount: 3 });
        await typeHuman(vInput, CONTRACT_ADDRESS);
        await sleep(300);
        await vpage.evaluate(() => {
          const buttons = [...document.querySelectorAll("button")];
          const target = buttons.find((b) =>
            (b.textContent || "").trim().startsWith("Scan Wallet"),
          );
          target?.click();
        });
        await vpage.waitForFunction(
          () =>
            !!document.querySelector(".scanner-result-header") &&
            document.body.innerText.includes("Soroban Smart Contract"),
          { timeout: 45000, polling: 200 },
        );
        await sleep(1200);
        await vpage.screenshot({
          path: path.join(STILLS_DIR, "vercel_contract_scan.png"),
        });
        console.log("still: vercel_contract_scan.png (live production scan)");
      }
    } catch (e) {
      console.warn(`Vercel live scan skipped: ${e.message}`);
    }

    await vpage.close();

    await fs.writeFile(
      path.join(RAW_DIR, "scenes.json"),
      JSON.stringify(manifest, null, 2),
    );

    clearTimeout(watchdog);
    console.log("Capture complete:", Object.keys(manifest).join(", "));
  } finally {
    await browser.close().catch(() => {});
  }
}

try {
  await main();
  process.exit(0);
} catch (error) {
  console.error("Capture failed:", error?.message || error);
  if (error?.stack) console.error(error.stack.split("\n").slice(0, 6).join("\n"));
  // Transient CDP navigation races can abort mid-run; retry once if the run
  // got past scene A (footage is skip-reused via scenes.json manifest).
  if (
    String(error?.message || "").includes("Execution context was destroyed") &&
    !process.env.CAPTURE_RETRY
  ) {
    console.log("Retrying capture once (transient navigation race)…");
    process.env.CAPTURE_RETRY = "1";
    const { execFileSync } = await import("node:child_process");
    try {
      execFileSync(process.execPath, [new URL(import.meta.url).pathname], {
        stdio: "inherit",
        env: process.env,
        timeout: 540_000,
      });
      process.exit(0);
    } catch (e2) {
      console.error("Capture retry failed:", e2?.message || e2);
      process.exit(1);
    }
  }
  process.exit(1);
}
