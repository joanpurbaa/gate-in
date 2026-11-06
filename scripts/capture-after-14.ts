import { chromium } from "playwright";
import * as fs from "fs";
import * as path from "path";

const OUT_DIR = path.resolve(process.cwd(), "docs/screenshots/after-14");
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function main() {
  const browser = await chromium.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
  });

  // 1. Mobile (390px)
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  const mobPage = await mobileContext.newPage();
  await mobPage.goto("http://localhost:3000/docs", { waitUntil: "networkidle" });
  await mobPage.waitForTimeout(1000);

  // Verifikasi tidak ada horizontal overflow
  const mobOverflow = await mobPage.evaluate(() => {
    return {
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      hasHorizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
  console.log("390px Mobile Overflow Check:", mobOverflow);

  await mobPage.screenshot({
    path: path.join(OUT_DIR, "docs-390.png"),
    fullPage: false,
  });
  console.log("Saved docs/screenshots/after-14/docs-390.png");

  await mobileContext.close();

  // 2. Desktop (1440px)
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const deskPage = await desktopContext.newPage();
  await deskPage.goto("http://localhost:3000/docs", { waitUntil: "networkidle" });
  await deskPage.waitForTimeout(1000);

  // Verifikasi tidak ada horizontal overflow
  const deskOverflow = await deskPage.evaluate(() => {
    return {
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      hasHorizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
  console.log("1440px Desktop Overflow Check:", deskOverflow);

  await deskPage.screenshot({
    path: path.join(OUT_DIR, "docs-1440.png"),
    fullPage: false,
  });
  console.log("Saved docs/screenshots/after-14/docs-1440.png");

  await desktopContext.close();
  await browser.close();

  console.log("=== SCREENSHOTS AFTER-14 SELESAI ===");
}

main().catch((err) => {
  console.error("Gagal capture after-14:", err);
  process.exit(1);
});
