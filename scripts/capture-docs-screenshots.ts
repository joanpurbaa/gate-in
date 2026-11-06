import { chromium, type Page } from "playwright";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

const OUT_DIR = path.resolve(process.cwd(), "public/docs");
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function saveWebP(page: Page, filename: string, quality = 82) {
  const filePath = path.join(OUT_DIR, filename);
  const client = await page.context().newCDPSession(page);
  const { data } = await client.send("Page.captureScreenshot", {
    format: "webp",
    quality,
  });
  const buf = Buffer.from(data, "base64");
  fs.writeFileSync(filePath, buf);
  const kb = (buf.length / 1024).toFixed(1);
  console.log(`[Screenshot] ${filename} -> ${kb} KB`);
}

async function main() {
  console.log("=== MEMULAI PENGAMBILAN TANGKAPAN LAYAR PANDUAN GATEIN ===");

  // 1. Reset data demo via seed
  console.log("1. Mereset database demo via prisma/seed.ts...");
  execSync("node prisma/seed.ts", { stdio: "inherit" });

  const browser = await chromium.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
  });

  // --------------------------------------------------------------------------
  // ALUR PENGUNJUNG (390px Mobile Viewport, 2x Scale)
  // --------------------------------------------------------------------------
  console.log("\n2. Mengambil Tangkapan Layar Alur Pengunjung (390px x 844px)...");
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  });
  const mobPage = await mobileContext.newPage();

  // 2.1 Beranda
  await mobPage.goto("http://localhost:3000/", { waitUntil: "networkidle" });
  await mobPage.waitForTimeout(800);
  await saveWebP(mobPage, "pengunjung-01-beranda.webp");

  // 2.2 Kategori & Pencarian
  const musicPill = mobPage.locator("button:has-text('Musik')").first();
  if (await musicPill.isVisible()) {
    await musicPill.click();
    await mobPage.waitForTimeout(600);
  }
  await saveWebP(mobPage, "pengunjung-02-kategori-pencarian.webp");

  // 2.3 Detail Acara
  await mobPage.goto("http://localhost:3000/e/festival-kopi-priangan-cupping", {
    waitUntil: "networkidle",
  });
  await mobPage.waitForTimeout(800);
  await saveWebP(mobPage, "pengunjung-03-detail-acara.webp");

  // 2.4 Denah Kursi dengan satu kursi terpilih
  await mobPage.goto("http://localhost:3000/e/festival-kopi-priangan-cupping/beli", {
    waitUntil: "networkidle",
  });
  await mobPage.waitForSelector("svg.touch-none", { timeout: 10000 });
  await mobPage.waitForTimeout(1000);

  // Cari kursi AVAILABLE dan klik
  const seats = mobPage.locator("svg.touch-none g[role='button']");
  const seatCount = await seats.count();
  for (let i = 0; i < seatCount; i++) {
    const s = seats.nth(i);
    const aria = (await s.getAttribute("aria-label")) || "";
    if (aria.includes("tersedia") || aria.includes("Rp")) {
      await s.click();
      break;
    }
  }
  await mobPage.waitForTimeout(800);
  await saveWebP(mobPage, "pengunjung-04-denah-kursi.webp");

  // 2.5 Checkout Drawer Terbuka dengan Data Pemesan Demo
  const ctaButton = mobPage.locator("button:has-text('Lanjut ke checkout')").first();
  if (await ctaButton.isVisible()) {
    await ctaButton.click();
    await mobPage.waitForTimeout(800);
  }
  const nameInput = mobPage.locator("#checkout-buyer-name");
  const phoneInput = mobPage.locator("#checkout-buyer-phone");
  if (await nameInput.isVisible()) {
    await nameInput.fill("Budi Demo");
    await phoneInput.fill("081234567890");
    await mobPage.waitForTimeout(500);
  }
  await saveWebP(mobPage, "pengunjung-05-checkout-drawer.webp");

  // 2.6 Halaman Pembayaran dengan Hitung Mundur 10 Menit
  const confirmBtn = mobPage.locator("button:has-text('Konfirmasi & tahan kursi')").first();
  if (await confirmBtn.isVisible()) {
    await confirmBtn.click();
    await mobPage.waitForNavigation({ timeout: 15000 }).catch(() => {});
    await mobPage.waitForTimeout(1200);
  }
  await saveWebP(mobPage, "pengunjung-06-pembayaran-timer.webp");

  // 2.7 Konfirmasi Pembayaran -> E-Ticket Resmi
  const payBtn = mobPage.locator("button:has-text('Bayar Sekarang')").first();
  if (await payBtn.isVisible()) {
    await payBtn.click();
    await mobPage.waitForNavigation({ timeout: 15000 }).catch(() => {});
    await mobPage.waitForTimeout(1500);
  }
  await saveWebP(mobPage, "pengunjung-07-tiket-qr.webp");

  // 2.8 Tiket Publik untuk Check-in Hari H
  await mobPage.goto("http://localhost:3000/tiket/DEMO000VLD", { waitUntil: "networkidle" });
  await mobPage.waitForTimeout(800);
  await saveWebP(mobPage, "pengunjung-08-hari-h-checkin.webp");

  await mobileContext.close();

  // --------------------------------------------------------------------------
  // ALUR PENYELENGGARA (1440px Desktop Viewport, 2x Scale)
  // --------------------------------------------------------------------------
  console.log("\n3. Mengambil Tangkapan Layar Alur Penyelenggara (1440px x 900px)...");
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const deskPage = await desktopContext.newPage();

  // 3.1 Login Penyelenggara
  await deskPage.goto("http://localhost:3000/admin/login", { waitUntil: "networkidle" });
  await deskPage.locator("#email").fill("panitia@demo.id");
  await deskPage.locator("#password").fill("demo1234");
  await deskPage.waitForTimeout(500);
  await saveWebP(deskPage, "penyelenggara-01-login.webp");

  // 3.2 Dashboard Penyelenggara
  await deskPage.locator("button[type='submit']").click();
  await deskPage.waitForNavigation({ timeout: 10000 }).catch(() => {});
  await deskPage.waitForTimeout(1000);
  await saveWebP(deskPage, "penyelenggara-02-dashboard.webp");

  // 3.3 Wizard Langkah 1: Info Dasar & Jadwal
  await deskPage.goto("http://localhost:3000/admin/events/new", { waitUntil: "networkidle" });
  await deskPage.waitForSelector("input[placeholder*='Bandung Tech Summit']", { timeout: 10000 });
  await deskPage.locator("input[placeholder*='Bandung Tech Summit']").fill("Bandung Creative Tech Summit 2026");
  const venueField = deskPage.locator("input[placeholder*='Summarecon']");
  if (await venueField.isVisible()) {
    await venueField.fill("The Oval Ballroom Summarecon");
  }
  const addrField = deskPage.locator("input[placeholder*='Bulevar']");
  if (await addrField.isVisible()) {
    await addrField.fill("Jl. Bulevar Summarecon Mall Bandung");
  }
  await deskPage.waitForTimeout(600);
  await saveWebP(deskPage, "penyelenggara-03-wizard-info.webp");

  // 3.4 Wizard Langkah 2: Generator Denah Kursi
  const step2Btn = deskPage.locator("button:has-text('Lanjut ke Layout Kursi')");
  if (await step2Btn.isVisible()) {
    await step2Btn.click();
    await deskPage.waitForTimeout(1000);
  }
  await saveWebP(deskPage, "penyelenggara-04-wizard-layout.webp");

  // 3.5 Wizard Langkah 3: Zona & Harga
  const step3Btn = deskPage.locator("button:has-text('Lanjut ke Zona & Harga')");
  if (await step3Btn.isVisible()) {
    await step3Btn.click();
    await deskPage.waitForTimeout(1000);
  }
  await saveWebP(deskPage, "penyelenggara-05-wizard-zona.webp");

  // 3.6 Wizard Langkah 4: Review & Simpan
  const step4Btn = deskPage.locator("button:has-text('Lanjut ke Review & Publish')");
  if (await step4Btn.isVisible()) {
    await step4Btn.click();
    await deskPage.waitForTimeout(1000);
  }
  await saveWebP(deskPage, "penyelenggara-06-wizard-review.webp");

  // Event Bandung Tech Summit untuk monitor live
  const techSummitId = "cmw4xolco0002g6rzidjuo3ts";

  // 3.7 Monitor Acara & Denah Live (dengan kursi hijau check-in)
  await deskPage.goto(`http://localhost:3000/admin/events/${techSummitId}`, {
    waitUntil: "networkidle",
  });
  await deskPage.waitForTimeout(1200);
  await saveWebP(deskPage, "penyelenggara-07-monitor-denah-live.webp");

  // 3.8 Scanner Check-in
  await deskPage.goto(`http://localhost:3000/admin/events/${techSummitId}/checkin`, {
    waitUntil: "networkidle",
  });
  await deskPage.waitForTimeout(800);
  await saveWebP(deskPage, "penyelenggara-08-scanner-checkin.webp");

  // 3.9 Check-in Hasil VALID (DEMO000VLD)
  const manualInput = deskPage.locator("input[placeholder*='DEMO000VLD']");
  const checkBtn = deskPage.locator("button[type='submit']:has-text('Check-in')");
  if (await manualInput.isVisible()) {
    await manualInput.fill("DEMO000VLD");
    if (await checkBtn.isVisible()) {
      await checkBtn.click();
      await deskPage.waitForTimeout(700);
    }
  }
  await saveWebP(deskPage, "penyelenggara-09-checkin-valid.webp");

  // Tutup overlay jika ada (klik backdrop)
  await deskPage.mouse.click(100, 100);
  await deskPage.waitForTimeout(400);

  // 3.10 Check-in Hasil SUDAH DIGUNAKAN (DEMO000USD)
  if (await manualInput.isVisible()) {
    await manualInput.fill("DEMO000USD");
    if (await checkBtn.isVisible()) {
      await checkBtn.click();
      await deskPage.waitForTimeout(700);
    }
  }
  await saveWebP(deskPage, "penyelenggara-10-checkin-used.webp");

  // Tutup overlay jika ada
  await deskPage.mouse.click(100, 100);
  await deskPage.waitForTimeout(400);

  // 3.11 Check-in Hasil TIDAK VALID (SALAH12345)
  if (await manualInput.isVisible()) {
    await manualInput.fill("SALAH12345");
    if (await checkBtn.isVisible()) {
      await checkBtn.click();
      await deskPage.waitForTimeout(700);
    }
  }
  await saveWebP(deskPage, "penyelenggara-11-checkin-invalid.webp");

  // 3.12 Tab Peserta & Transaksi + Unduh CSV
  await deskPage.goto(`http://localhost:3000/admin/events/${techSummitId}`, {
    waitUntil: "networkidle",
  });
  await deskPage.waitForTimeout(800);
  const participantsTab = deskPage.locator("button:has-text('Peserta')").first();
  if (await participantsTab.isVisible()) {
    await participantsTab.click();
    await deskPage.waitForTimeout(800);
  }
  await saveWebP(deskPage, "penyelenggara-12-peserta-transaksi.webp");

  await desktopContext.close();
  await browser.close();

  // 4. Jalankan ulang seed agar data demo kembali bersih
  console.log("\n4. Menjalankan ulang seed agar database demo kembali bersih...");
  execSync("node prisma/seed.ts", { stdio: "inherit" });

  console.log("\n=== SELESAI: SEMUA 20 GAMBAR PANDUAN BERHASIL DIAMBIL ===");
}

main().catch((err) => {
  console.error("Gagal mengambil screenshot:", err);
  process.exit(1);
});
