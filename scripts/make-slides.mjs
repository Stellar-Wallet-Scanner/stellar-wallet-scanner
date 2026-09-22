import puppeteer from "puppeteer-core";
import fs from "fs";

const CHROME =
  "/home/codespace/.cache/puppeteer/chrome/linux-153.0.8010.36/chrome-linux64/chrome";
const OUT = "video-assets/slides";
fs.mkdirSync(OUT, { recursive: true });

const b64 = (p) =>
  `data:image/png;base64,${fs.readFileSync(p).toString("base64")}`;
const UI = (n) => b64(`video-assets/ui/${n}.png`);
const ICON = () => b64(`public/stellar-scan-icon.png`);

const css = `
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1920px;height:1080px;overflow:hidden}
body{font-family:'DejaVu Sans','Inter',system-ui,Arial,sans-serif;background:#060b09;color:#eef5f1;position:relative}
.bg{position:absolute;inset:0;background:
  radial-gradient(1200px 700px at 78% -10%, rgba(57,168,108,.16), transparent 60%),
  radial-gradient(900px 600px at 8% 110%, rgba(36,123,76,.14), transparent 60%),
  linear-gradient(160deg,#060b09 0%,#08130d 55%,#050a08 100%)}
.grid-deco{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.028) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.028) 1px,transparent 1px);background-size:64px 64px}
.glow{position:absolute;width:900px;height:900px;border-radius:50%;filter:blur(140px);opacity:.14;background:#39a86c}
.slide{position:absolute;inset:0;padding:90px 110px;display:flex;flex-direction:column}
.eyebrow{display:inline-flex;align-items:center;gap:12px;color:#4ed88f;font-weight:800;letter-spacing:.28em;font-size:22px;text-transform:uppercase}
.eyebrow .dot{width:12px;height:12px;border-radius:50%;background:#39a86c;box-shadow:0 0 24px #39a86c}
h1{font-size:120px;font-weight:900;letter-spacing:-.045em;line-height:1.02;margin-top:34px}
h2{font-size:76px;font-weight:900;letter-spacing:-.04em;line-height:1.05;margin-top:26px}
.sub{margin-top:30px;font-size:32px;color:#9fb3a8;font-weight:600;line-height:1.5;max-width:1350px}
.accent{background:linear-gradient(90deg,#4ed88f,#8fe6bd);-webkit-background-clip:text;background-clip:text;color:transparent}
.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:36px;margin-top:70px}
.card{background:rgba(255,255,255,.032);border:1px solid rgba(255,255,255,.09);border-radius:28px;padding:44px;position:relative;overflow:hidden}
.card .num{font-size:26px;font-weight:900;color:#4ed88f;letter-spacing:.12em}
.card h3{font-size:38px;font-weight:900;margin:18px 0 14px;letter-spacing:-.02em}
.card p{font-size:25px;color:#9fb3a8;line-height:1.55;font-weight:500}
.card .ic{width:84px;height:84px;border-radius:22px;display:grid;place-items:center;font-size:40px;background:rgba(57,168,108,.12);border:1px solid rgba(57,168,108,.25)}
.foot{position:absolute;left:110px;right:110px;bottom:52px;display:flex;justify-content:space-between;align-items:center;color:#5c7166;font-size:22px;font-weight:700;letter-spacing:.06em}
.foot .l{display:flex;align-items:center;gap:14px}
.foot img{width:44px;height:44px;border-radius:12px}
.foot .live{display:flex;align-items:center;gap:10px}
.foot .live .d{width:10px;height:10px;border-radius:50%;background:#39a86c;box-shadow:0 0 14px #39a86c}
.pill{display:inline-flex;align-items:center;gap:12px;padding:14px 26px;border-radius:999px;border:1px solid rgba(78,216,143,.35);background:rgba(57,168,108,.1);color:#8fe6bd;font-weight:800;font-size:24px}
.pill code{font-family:'JetBrains Mono',monospace;font-weight:700}
.shotwrap{position:relative;border-radius:22px;overflow:hidden;border:1px solid rgba(255,255,255,.14);box-shadow:0 40px 120px rgba(0,0,0,.6), 0 0 0 1px rgba(255,255,255,.04)}
.browserbar{height:56px;background:#101915;display:flex;align-items:center;gap:10px;padding:0 22px;border-bottom:1px solid rgba(255,255,255,.07)}
.bdot{width:15px;height:15px;border-radius:50%}
.urlbox{flex:1;margin-left:14px;height:34px;border-radius:9px;background:#0a120e;border:1px solid rgba(255,255,255,.08);display:flex;align-items:center;padding:0 16px;color:#7d9187;font-family:'DejaVu Sans Mono',monospace;font-size:17px}
.callout{position:absolute;display:flex;align-items:center;gap:14px;background:rgba(6,14,10,.92);border:1.5px solid rgba(78,216,143,.6);border-radius:16px;padding:16px 24px;box-shadow:0 18px 50px rgba(0,0,0,.55), 0 0 40px rgba(57,168,108,.15);backdrop-filter:blur(6px)}
.callout .cico{width:46px;height:46px;border-radius:12px;background:rgba(57,168,108,.16);display:grid;place-items:center;font-size:24px;flex:none}
.callout .ct{font-size:24px;font-weight:900;letter-spacing:-.01em}
.callout .cs{font-size:19px;color:#9fb3a8;font-weight:600;margin-top:3px}
.callout:after{content:'';position:absolute;width:12px;height:12px;border-radius:50%;background:#4ed88f;box-shadow:0 0 18px #4ed88f}
.codewin{background:#0a1210;border:1px solid rgba(255,255,255,.1);border-radius:22px;overflow:hidden;box-shadow:0 40px 120px rgba(0,0,0,.6)}
.codebar{height:56px;background:#101915;display:flex;align-items:center;padding:0 22px;gap:10px;color:#7d9187;font-size:19px;font-family:'JetBrains Mono',monospace}
pre{font-family:'DejaVu Sans Mono',monospace;font-size:23px;line-height:1.62;padding:34px 40px;color:#cfe3d8;white-space:pre}
.k{color:#4ed88f}.f{color:#8ab4ff}.s{color:#e8c07d}.c{color:#5c7166}.n{color:#e8907d}
`;

const FOOT = (right) => `<div class="foot">
  <div class="l"><img src="${ICON()}"/>STELLAR WALLET SCANNER</div>
  <div class="live"><span class="d"></span>${right}</div>
</div>`;

const page = await (await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--force-color-profile=srgb", "--hide-scrollbars", "--disable-gpu", "--font-render-hinting=none"],
})).newPage();
await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });

async function shot(name, body, extraCss = "") {
  await page.setContent(
    `<!doctype html><html><head><style>${css}${extraCss}</style></head><body>${body}</body></html>`,
    { waitUntil: "domcontentloaded", timeout: 20000 },
  ).catch(() => {});
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log("[slide]", name);
}

/* ---------- S01 TITLE ---------- */
await shot("s01-title", `<div class="bg"></div><div class="grid-deco"></div><div class="glow" style="top:-300px;right:-200px"></div>
<div class="slide" style="justify-content:center">
  <div class="eyebrow"><span class="dot"></span>LIVE ON STELLAR TESTNET</div>
  <h1>Inspect any Stellar wallet<br/>or contract.<br/><span class="accent">In seconds.</span></h1>
  <div class="sub">Stellar Wallet Scanner — the security &amp; inspection platform for Stellar accounts and Soroban smart contracts.</div>
  <div style="margin-top:56px;display:flex;gap:24px">
    <div class="pill"><code>G…</code>&nbsp;Classic accounts</div>
    <div class="pill"><code>C…</code>&nbsp;Soroban contracts</div>
    <div class="pill">⚡ Instant security report</div>
  </div>
</div>${FOOT("stellar-wallet-scanner.vercel.app")}`);

/* ---------- S02 PROBLEM ---------- */
await shot("s02-problem", `<div class="bg"></div><div class="grid-deco"></div><div class="glow" style="bottom:-400px;left:-250px"></div>
<div class="slide">
  <div class="eyebrow" style="color:#e8907d"><span class="dot" style="background:#e8907d;box-shadow:0 0 24px #e8907d"></span>THE PROBLEM</div>
  <h2>Stellar is transparent.<br/><span style="color:#e8907d">Understanding it isn't.</span></h2>
  <div class="cards">
    <div class="card"><div class="ic">🔍</div><div class="num">01</div><h3>Chain data is raw</h3><p>Balances, signers, trustlines and WASM live across Horizon &amp; RPC — unreadable for humans.</p></div>
    <div class="card"><div class="ic">⚠️</div><div class="num">02</div><h3>Risks stay invisible</h3><p>Weak signer setups, missing trustlines, sketchy contract metadata — you only see them after it hurts.</p></div>
    <div class="card"><div class="ic">🧩</div><div class="num">03</div><h3>Tools are fragmented</h3><p>One explorer for accounts, another for contracts, nothing that answers "is this safe?" in one place.</p></div>
  </div>
</div>${FOOT("stellar-wallet-scanner.vercel.app")}`);

/* ---------- S03 SOLUTION ---------- */
await shot("s03-solution", `<div class="bg"></div><div class="grid-deco"></div><div class="glow" style="top:-250px;left:35%"></div>
<div class="slide">
  <div class="eyebrow"><span class="dot"></span>THE SOLUTION</div>
  <h2>One address in.<br/><span class="accent">A full security report out.</span></h2>
  <div style="display:flex;align-items:center;gap:44px;margin-top:64px">
    <div style="flex:1.15" class="card">
      <div style="font-size:22px;font-weight:800;color:#9fb3a8;letter-spacing:.1em">PASTE ANY ADDRESS</div>
      <div style="margin-top:22px;background:#0a120e;border:1px solid rgba(78,216,143,.4);border-radius:16px;padding:26px 28px;font-family:'JetBrains Mono',monospace;font-size:24px;display:flex;justify-content:space-between;align-items:center">
        <span>GC32BZUX…K2WKGOM</span><span style="color:#4ed88f;font-weight:900">⌘⏎</span>
      </div>
      <div style="margin-top:18px;display:flex;gap:16px"><div class="pill" style="font-size:20px">Auto-detects G… / C…</div><div class="pill" style="font-size:20px">No wallet connect</div></div>
    </div>
    <div style="font-size:70px;color:#4ed88f">→</div>
    <div style="flex:1" class="card">
      <div style="font-size:22px;font-weight:800;color:#9fb3a8;letter-spacing:.1em">INSTANT REPORT</div>
      <div style="margin-top:22px;display:grid;gap:14px">
        <div style="display:flex;justify-content:space-between;font-size:24px;font-weight:700"><span>XLM &amp; assets</span><span style="color:#4ed88f">✓</span></div>
        <div style="display:flex;justify-content:space-between;font-size:24px;font-weight:700"><span>Signers &amp; security</span><span style="color:#4ed88f">✓</span></div>
        <div style="display:flex;justify-content:space-between;font-size:24px;font-weight:700"><span>WASM &amp; functions</span><span style="color:#4ed88f">✓</span></div>
        <div style="display:flex;justify-content:space-between;font-size:24px;font-weight:700"><span>Security score 0–100</span><span style="color:#4ed88f">✓</span></div>
      </div>
    </div>
  </div>
</div>${FOOT("stellar-wallet-scanner.vercel.app")}`);

/* ---------- UI COMPOSITES ---------- */
async function composite(name, img, title, callouts) {
  const calls = callouts
    .map(
      (c) => `<div class="callout" style="left:${c.x}px;top:${c.y}px">
        <div class="cico">${c.i}</div><div><div class="ct">${c.t}</div><div class="cs">${c.s}</div></div>
      </div>`,
    )
    .join("");
  await shot(
    name,
    `<div class="bg"></div><div class="grid-deco"></div>
<div class="slide" style="padding:70px 100px">
  <div style="display:flex;justify-content:space-between;align-items:flex-end">
    <div><div class="eyebrow"><span class="dot"></span>${title.eyebrow}</div>
    <h2 style="font-size:62px;margin-top:18px">${title.h}</h2></div>
    <div class="pill" style="font-size:21px">${title.pill}</div>
  </div>
  <div class="shotwrap" style="margin-top:36px">
    <div class="browserbar">
      <span class="bdot" style="background:#ff5f57"></span><span class="bdot" style="background:#febc2e"></span><span class="bdot" style="background:#28c840"></span>
      <div class="urlbox">https://stellar-wallet-scanner.vercel.app</div>
    </div>
    <img src="${img}" style="width:100%;display:block"/>
    ${calls}
  </div>
</div>${FOOT("LIVE DEPLOYMENT · VERCEL")}`,
  );
}

await composite("s04-account", UI("03-scan-account"),
  { eyebrow: "ACCOUNT SCANNER", h: `Every account, <span class="accent">x-rayed live</span>`, pill: "REAL TESTNET DATA" },
  [
    { x: 30, y: 200, i: "💰", t: "Live XLM balance", s: "Pulled from Horizon in real time" },
    { x: 1120, y: 170, i: "🛡️", t: "Security score", s: "0–100 with severity findings" },
    { x: 700, y: 620, i: "🔑", t: "Signers & trustlines", s: "Full account structure exposed" },
  ]);

await composite("s05-contract", UI("05-scan-contract"),
  { eyebrow: "CONTRACT SCANNER", h: `Soroban contracts, <span class="accent">fully decoded</span>`, pill: "C… ADDRESSES" },
  [
    { x: 30, y: 180, i: "🧬", t: "WASM hash & size", s: "Bytecode verified on-chain" },
    { x: 1100, y: 150, i: "⚙️", t: "Exported functions", s: "Every entrypoint listed" },
    { x: 640, y: 640, i: "📋", t: "Contract metadata", s: "Instance & storage info" },
  ]);

await composite("s06-workflow", UI("wf-scanning"),
  { eyebrow: "LIVE WORKFLOW", h: `Type. Scan. <span class="accent">Report.</span>`, pill: "⚡ SECONDS PER SCAN" },
  [
    { x: 40, y: 240, i: "⌨️", t: "Paste address", s: "Type is auto-detected" },
    { x: 1150, y: 300, i: "📡", t: "Live scan", s: "Backend queries Stellar Testnet" },
    { x: 500, y: 640, i: "✅", t: "Instant findings", s: "Ranked by severity" },
  ]);

await composite("s07-registry", UI("07-registry"),
  { eyebrow: "ON-CHAIN REGISTRY", h: `The scanner itself is <span class="accent">on-chain</span>`, pill: "SOROBAN CONTRACT" },
  [
    { x: 40, y: 210, i: "🛡️", t: "ScannerRegistry", s: "Custom Soroban smart contract" },
    { x: 1120, y: 180, i: "#️⃣", t: "Live scan counter", s: "Stored in contract instance" },
    { x: 620, y: 640, i: "🔐", t: "Admin & version", s: "Immutable, verifiable on Testnet" },
  ]);

/* ---------- S08 ARCHITECTURE ---------- */
const box = (x, y, w, h, t, s, accent = false) =>
  `<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;border-radius:20px;border:1.5px solid ${accent ? "rgba(78,216,143,.65)" : "rgba(255,255,255,.14)"};background:${accent ? "rgba(57,168,108,.14)" : "rgba(255,255,255,.035)"};display:flex;flex-direction:column;justify-content:center;padding:0 26px">
     <div style="font-size:29px;font-weight:900">${t}</div><div style="font-size:20px;color:#9fb3a8;margin-top:6px;font-weight:600">${s}</div></div>`;
const arrow = (x, y, w, label) =>
  `<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px"><div style="height:2px;background:linear-gradient(90deg,rgba(78,216,143,.9),rgba(78,216,143,.25))"></div><div style="font-size:18px;color:#7d9187;font-weight:700;margin-top:8px;letter-spacing:.04em">${label}</div></div>`;
await shot("s08-architecture", `<div class="bg"></div><div class="grid-deco"></div>
<div class="slide">
  <div class="eyebrow"><span class="dot"></span>ARCHITECTURE</div>
  <h2 style="font-size:64px">Full stack. <span class="accent">Real chain.</span></h2>
  <div style="position:relative;height:560px;margin-top:40px">
    ${box(0, 30, 380, 110, "User / Browser", "Desktop · Tablet · Mobile")}
    ${box(0, 230, 380, 110, "React + Vite", "Tailwind · Stellar SDK", true)}
    ${box(560, 150, 380, 110, "Auto router", "G… account ↔ C… contract", true)}
    ${box(1120, 30, 380, 110, "Rust · Axum API", "Security analysis engine")}
    ${box(1120, 270, 380, 110, "Soroban RPC", "Contract + WASM inspection")}
    ${box(560, 420, 380, 110, "Horizon API", "Accounts · assets · signers")}
    ${box(1120, 430, 380, 110, "ScannerRegistry", "On-chain scan counter", true)}
    ${arrow(300, 80, 300, "")}
    ${arrow(300, 280, 300, "")}
    ${arrow(870, 200, 290, "")}
    ${arrow(870, 320, 290, "")}
  </div>
</div>${FOOT("DEPLOYED ON VERCEL · FRONTEND + BACKEND")}`);

/* ---------- S09 CODE ---------- */
await shot("s09-code", `<div class="bg"></div><div class="grid-deco"></div><div class="glow" style="top:-300px;left:-200px"></div>
<div class="slide">
  <div class="eyebrow"><span class="dot"></span>BUILT WITH SOROBAN SDK</div>
  <h2 style="font-size:64px">Rust smart contract, <span class="accent">1.2 KB of WASM</span></h2>
  <div style="display:flex;gap:44px;margin-top:44px;align-items:flex-start">
    <div class="codewin" style="flex:1.5">
      <div class="codebar"><span class="bdot" style="background:#ff5f57"></span><span class="bdot" style="background:#febc2e"></span><span class="bdot" style="background:#28c840"></span>&nbsp;scanner_registry/src/lib.rs</div>
<pre><span class="k">pub</span> <span class="f">fn</span> <span class="k">initialize</span>(env: Env, admin: Address, version: String) {
  <span class="c">// one-time init — reverts if already initialized</span>
  env.storage().instance().<span class="f">set</span>(&amp;ADMIN, &amp;admin);
  env.storage().instance().<span class="f">set</span>(&amp;VERSION, &amp;version);
  env.storage().instance().<span class="f">set</span>(&amp;SCANS, &amp;<span class="n">0u64</span>);
}

<span class="k">pub</span> <span class="f">fn</span> <span class="k">record_scan</span>(env: Env, caller: Address) {
  caller.<span class="f">require_auth</span>();              <span class="c">// admin-only</span>
  <span class="k">let</span> scans: u64 = env.storage().instance().<span class="f">get</span>(&amp;SCANS).unwrap_or(<span class="n">0</span>);
  env.storage().instance().<span class="f">set</span>(&amp;SCANS, &amp;(scans + <span class="n">1</span>));
}</pre>
    </div>
    <div style="flex:1;display:grid;gap:22px">
      <div class="card" style="padding:34px"><div class="num">TESTS</div><div style="font-size:34px;font-weight:900;margin-top:10px;color:#4ed88f">3 / 3 passing</div><p style="font-size:22px;margin-top:8px">init · record · double-init guard</p></div>
      <div class="card" style="padding:34px"><div class="num">DEPLOYED</div><div style="font-size:34px;font-weight:900;margin-top:10px">Testnet · v1.0.0</div><p style="font-family:'JetBrains Mono',monospace;font-size:17px;margin-top:8px;color:#7d9187">CAK5B…332VL</p></div>
      <div class="card" style="padding:34px"><div class="num">EXPORTS</div><div style="font-size:34px;font-weight:900;margin-top:10px">5 functions</div><p style="font-size:22px;margin-top:8px">initialize · get_admin · get_version · get_scan_count · record_scan</p></div>
    </div>
  </div>
</div>${FOOT("CONTRACT VERIFIABLE ON STELLAR EXPERT")}`);

/* ---------- S10 VALUE ---------- */
await shot("s10-value", `<div class="bg"></div><div class="grid-deco"></div><div class="glow" style="bottom:-350px;right:-200px"></div>
<div class="slide">
  <div class="eyebrow"><span class="dot"></span>WHY IT'S DIFFERENT</div>
  <h2>Security-first by design.</h2>
  <div class="cards" style="grid-template-columns:repeat(2,1fr);margin-top:56px">
    <div class="card"><div class="ic">🔑</div><h3>Zero credentials, ever</h3><p>No wallet connect. No private keys. No seed phrases. Pure read-only analysis.</p></div>
    <div class="card"><div class="ic">⛓️</div><h3>Real chain data only</h3><p>Nothing simulated — every number comes live from Horizon, Soroban RPC and the deployed registry.</p></div>
    <div class="card"><div class="ic">🧠</div><h3>Actionable security</h3><p>A 0–100 score, severity-ranked findings and plain-English recommendations — not raw JSON.</p></div>
    <div class="card"><div class="ic">🚀</div><h3>Ship-ready stack</h3><p>React + Rust + Soroban, fully deployed on Vercel with CI-friendly structure and passing tests.</p></div>
  </div>
</div>${FOOT("stellar-wallet-scanner.vercel.app")}`);

/* ---------- S11 MOBILE ---------- */
await shot("s11-mobile", `<div class="bg"></div><div class="grid-deco"></div>
<div class="slide">
  <div class="eyebrow"><span class="dot"></span>ANY SCREEN</div>
  <h2 style="font-size:64px">Built responsive, <span class="accent">everywhere</span></h2>
  <div style="display:flex;gap:60px;justify-content:center;margin-top:50px">
    <div style="width:360px;border-radius:44px;border:3px solid rgba(255,255,255,.16);overflow:hidden;box-shadow:0 40px 120px rgba(0,0,0,.6)"><img src="${UI("10-mobile-dashboard")}" style="width:100%;display:block"/></div>
    <div style="width:360px;border-radius:44px;border:3px solid rgba(255,255,255,.16);overflow:hidden;box-shadow:0 40px 120px rgba(0,0,0,.6);margin-top:60px"><img src="${UI("11-mobile-scanner")}" style="width:100%;display:block"/></div>
    <div style="align-self:center;max-width:480px">
      <p style="font-size:30px;color:#c7d6cd;line-height:1.6;font-weight:600">The same live inspection experience — dashboard, scanner, history and analytics — on phones and tablets.</p>
      <div style="margin-top:30px;display:flex;gap:16px"><div class="pill" style="font-size:20px">📱 Mobile</div><div class="pill" style="font-size:20px">💻 Desktop</div><div class="pill" style="font-size:20px">🖥️ Tablet</div></div>
    </div>
  </div>
</div>${FOOT("FULLY RESPONSIVE UI")}`);

/* ---------- S12 OUTRO ---------- */
await shot("s12-outro", `<div class="bg"></div><div class="grid-deco"></div><div class="glow" style="top:-250px;left:30%"></div>
<div class="slide" style="justify-content:center;align-items:center;text-align:center">
  <div class="eyebrow"><span class="dot"></span>TRY IT NOW</div>
  <h1 style="font-size:100px;margin-top:26px">Scan the chain.<br/><span class="accent">Before it scans you.</span></h1>
  <div style="margin-top:50px;display:grid;gap:20px;font-family:'JetBrains Mono',monospace;font-size:27px;color:#8fe6bd">
    <div>🌐 stellar-wallet-scanner.vercel.app</div>
    <div>🛠️ github.com/mosesifunanya/stellar-wallet-scanner</div>
  </div>
  <div class="pill" style="margin-top:54px;font-size:26px">Built by Moses Ifunanya Nobei · React · Rust · Soroban · Stellar Testnet</div>
</div>${FOOT("THANK YOU FOR WATCHING")}`);

console.log("[slides] all done");
process.exit(0);
