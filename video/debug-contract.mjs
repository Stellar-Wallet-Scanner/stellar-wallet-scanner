import puppeteer from "puppeteer";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox","--disable-dev-shm-usage"] });
const page = await browser.newPage();
await page.setViewport({ width: 1600, height: 1000 });
page.on("pageerror", (e) => console.log("[pageerror]", String(e).slice(0,300)));
page.on("console", (m) => { const t = m.text(); if (!t.includes("[vite]")) console.log("[console]", t.slice(0,220)); });
page.on("response", (r) => { if (r.status() >= 400) console.log("[http"+r.status()+"]", r.url().slice(0,140)); });
await page.goto("http://localhost:5173", { waitUntil: "networkidle2", timeout: 45000 });
const input = await page.$('input[placeholder*="Enter G..."]');
await input.type("CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA", { delay: 8 });
await page.evaluate(() => {
  const b = [...document.querySelectorAll("button")].find((x) => (x.textContent||"").trim().startsWith("Scan Wallet"));
  b?.click();
});
for (let i = 0; i < 25; i++) {
  await sleep(2000);
  const s = await page.evaluate(() => ({
    header: !!document.querySelector(".scanner-result-header"),
    scanning: (document.querySelector(".scanner-button")?.textContent || "").trim(),
    err: document.querySelector(".scanner-error")?.textContent || "",
    text: document.body.innerText.replace(/\s+/g, " ").slice(0, 260),
  }));
  console.log(i, "header:", s.header, "| btn:", s.scanning.slice(0,20), "| err:", s.err.slice(0,80));
  if (s.header || s.err) { console.log("BODY:", s.text); break; }
}
await browser.close().catch(()=>{});
process.exit(0);
