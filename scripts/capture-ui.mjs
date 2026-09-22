import puppeteer from "puppeteer-core";
import { Keypair } from "@stellar/stellar-sdk";
import fs from "fs";

const CHROME = "/home/codespace/.cache/puppeteer/chrome/linux-153.0.8010.36/chrome-linux64/chrome";
const APP = "https://stellar-wallet-scanner.vercel.app";
const CONTRACT = "CAK5BORDDC4G3XDU4RBXDJU2PUSHOY4DQMX53ILJKGI2ORP2P5B332VL";
const OUT = "video-assets/ui";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log("[capture]", ...a);

fs.mkdirSync(OUT, { recursive: true });

async function getFundedAccount() {
  const addr = Keypair.random().publicKey();
  for (let i = 0; i < 4; i++) {
    try {
      const res = await fetch(`https://friendbot.stellar.org?addr=${addr}`);
      if (res.ok) {
        log("friendbot funded", addr);
        return addr;
      }
      log("friendbot attempt", i + 1, res.status);
    } catch (e) {
      log("friendbot error", e.message);
    }
    await sleep(3000);
  }
  return addr;
}

async function clickNav(page, label) {
  const ok = await page.evaluate((text) => {
    const btn = [...document.querySelectorAll("button")].find(
      (b) => b.textContent.trim() === text,
    );
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  }, label);
  if (!ok) log("nav not found:", label);
}

async function shot(page, name) {
  await page.screenshot({ path: `${OUT}/${name}.png` });
  log("shot", name);
}

const meta = {};

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: [
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--force-color-profile=srgb",
    "--hide-scrollbars",
    "--disable-gpu",
  ],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1.5 });
  await page.goto(APP, { waitUntil: "networkidle2", timeout: 60000 });
  await sleep(4000);
  await shot(page, "01-dashboard");

  // Scanner page
  await clickNav(page, "Scanner");
  await sleep(2000);
  await shot(page, "02-scanner");

  // --- Account scan workflow (with typing frames for fake-recording) ---
  const account = await getFundedAccount();
  meta.accountAddress = account;
  const input = await page.$(".scanner-input");
  if (input) {
    await input.click({ clickCount: 3 });
    for (let i = 0; i < account.length; i += 24) {
      await page.type(".scanner-input", account.slice(i, i + 24), { delay: 15 });
      if (i === 0) await shot(page, "wf-typing-1");
    }
    await shot(page, "wf-typed");
    await page.click(".scanner-button");
    await sleep(900);
    await shot(page, "wf-scanning");
    // wait for result
    for (let i = 0; i < 40; i++) {
      const done = await page.evaluate(
        () =>
          !!document.querySelector(".scanner-result, .scanner-error, .scanner-error-note"),
      );
      if (done) break;
      await sleep(1000);
    }
    await sleep(3000);
    await shot(page, "03-scan-account");
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await sleep(1200);
    await shot(page, "04-scan-account-bottom");
    await page.evaluate(() => window.scrollTo(0, 0));

    // --- Contract scan workflow ---
    const clear = await page.$(".scanner-input-clear");
    if (clear) await clear.click();
    await sleep(400);
    const inp2 = await page.$(".scanner-input");
    if (inp2) await inp2.click({ clickCount: 3 });
    await page.type(".scanner-input", CONTRACT, { delay: 12 });
    await page.click(".scanner-button");
    for (let i = 0; i < 40; i++) {
      const done = await page.evaluate(() => {
        const r = document.querySelector(".scanner-result");
        return r && r.textContent.includes("Soroban");
      });
      if (done) break;
      await sleep(1000);
    }
    await sleep(3000);
    await shot(page, "05-scan-contract");
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await sleep(1200);
    await shot(page, "06-scan-contract-bottom");
    await page.evaluate(() => window.scrollTo(0, 0));
  } else {
    log("scanner input not found!");
  }

  // Registry
  await clickNav(page, "Scanner Registry");
  await sleep(5000);
  await shot(page, "07-registry");

  // History
  await clickNav(page, "Scan History");
  await sleep(2000);
  await shot(page, "08-history");

  // Analytics
  await clickNav(page, "Security Analytics");
  await sleep(2500);
  await shot(page, "09-analytics");

  // Mobile responsive
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2.5 });
  await clickNav(page, "Dashboard");
  await sleep(2500);
  await shot(page, "10-mobile-dashboard");
  await clickNav(page, "Scanner");
  await sleep(2000);
  await shot(page, "11-mobile-scanner");

  meta.ok = true;
} catch (e) {
  meta.ok = false;
  meta.error = e.message;
  log("ERROR", e.message);
} finally {
  fs.writeFileSync(`${OUT}/meta.json`, JSON.stringify(meta, null, 2));
  await browser.close();
  log("done", JSON.stringify(meta));
}
