import { prisma } from "./db.ts";
import { formatRupiah } from "./money.ts";
import { formatDateTime, formatTimeRange } from "./time.ts";

export function resolveAppBaseUrl(requestOrigin?: string): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return (requestOrigin || "http://localhost:3000").replace(/\/$/, "");
}

/**
 * Kirim e-ticket pesanan ke WhatsApp pembeli menggunakan API Fonnte.
 * ATURAN KERAS: Gagal kirim WhatsApp TIDAK BOLEH menggagalkan pesanan.
 * Hasil dicatat di `Order.waStatus` (`SENT` | `FAILED` | `SKIPPED`).
 */
export async function sendOrderWhatsApp(
  orderId: string,
  requestOrigin?: string
): Promise<{ status: "SENT" | "FAILED" | "SKIPPED"; error?: string }> {
  const token = process.env.FONNTE_TOKEN?.trim();
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      event: true,
      tickets: {
        include: {
          seat: {
            include: { zone: true },
          },
        },
        orderBy: { code: "asc" },
      },
    },
  });

  if (!order) {
    return { status: "FAILED", error: "Order tidak ditemukan" };
  }

  if (!token) {
    await prisma.order.update({
      where: { id: orderId },
      data: { waStatus: "SKIPPED", waError: "FONNTE_TOKEN kosong" },
    });
    return { status: "SKIPPED" };
  }

  const baseUrl = resolveAppBaseUrl(requestOrigin);
  const ticketLines = order.tickets.map(
    (t) =>
      `• Kursi *${t.seat.label}* (${t.seat.zone?.name ?? "Reguler"}) — Kode: *${t.code}*\n  QR Tiket: ${baseUrl}/tiket/${t.code}`
  );

  const message = [
    `*E-TICKET GATEIN — ${order.event.name.toUpperCase()}*`,
    `Halo *${order.buyerName}*, pembayaran tiket Anda telah terkonfirmasi!`,
    ``,
    `📍 *Tempat:* ${order.event.venueName}`,
    `🗓 *Waktu Acara:* ${formatDateTime(order.event.startsAt)}`,
    `🚪 *Open Gate:* ${formatTimeRange(order.event.gateOpenAt, order.event.gateCloseAt)}`,
    `💳 *Total Dibayar:* ${formatRupiah(order.totalAmount)}`,
    ``,
    `*Daftar Kursi & Kode Tiket (${order.tickets.length}):*`,
    ...ticketLines,
    ``,
    `📄 *Halaman Semua Tiket Pesanan:*`,
    `${baseUrl}/pesanan/${order.id}`,
    ``,
    `_Tunjukkan QR code tiket saat check-in di pintu masuk venue._`,
  ].join("\n");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 7000);

  try {
    const form = new URLSearchParams();
    form.set("target", order.buyerPhone);
    form.set("message", message);

    const res = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        Authorization: token,
      },
      body: form,
      signal: controller.signal,
    });

    const data = (await res.json().catch(() => ({}))) as {
      status?: boolean;
      reason?: string;
      detail?: string;
    };

    if (!res.ok || data.status === false) {
      const errMsg = data.reason || data.detail || `HTTP ${res.status}`;
      await prisma.order.update({
        where: { id: orderId },
        data: { waStatus: "FAILED", waError: String(errMsg).slice(0, 200) },
      });
      return { status: "FAILED", error: String(errMsg) };
    }

    await prisma.order.update({
      where: { id: orderId },
      data: { waStatus: "SENT", waError: null },
    });
    return { status: "SENT" };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Gagal menghubungi API Fonnte";
    await prisma.order.update({
      where: { id: orderId },
      data: { waStatus: "FAILED", waError: errMsg.slice(0, 200) },
    });
    return { status: "FAILED", error: errMsg };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Kirim notifikasi WhatsApp ke pembeli saat reservasi kursi kedaluwarsa.
 * Menjelaskan bahwa waktu 10 menit telah habis dan kursi telah kembali ke denah.
 * Dijamin idempotent: tidak akan mengirim notifikasi berulang jika `expiredNotifiedAt` sudah terisi.
 * Gagal kirim WhatsApp TIDAK BOLEH menggagalkan proses pelepasan kursi.
 */
export async function sendOrderExpiredWhatsApp(
  orderId: string,
  releasedSeatLabels: string[] = [],
  requestOrigin?: string
): Promise<{ status: "SENT" | "FAILED" | "SKIPPED"; error?: string }> {
  const token = process.env.FONNTE_TOKEN?.trim();
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      event: true,
    },
  });

  if (!order) {
    return { status: "FAILED", error: "Order tidak ditemukan" };
  }

  // Cegah notifikasi berulang untuk order yang sama
  if (order.expiredNotifiedAt) {
    return { status: "SKIPPED", error: "Notifikasi kedaluwarsa sudah pernah dikirim" };
  }

  if (!token) {
    await prisma.order.update({
      where: { id: orderId },
      data: { expiredNotifiedAt: new Date() },
    });
    return { status: "SKIPPED" };
  }

  const baseUrl = resolveAppBaseUrl(requestOrigin);
  const seatsText =
    releasedSeatLabels.length > 0
      ? releasedSeatLabels.join(", ")
      : "yang Anda pilih sebelumnya";

  const message = [
    `*RESERVASI KEDALUWARSA — GATEIN*`,
    `Halo *${order.buyerName}*, batas waktu 10 menit untuk menahan kursi acara *${order.event.name}* telah berakhir.`,
    ``,
    `Kursi (*${seatsText}*) telah dikembalikan ke denah dan kini dapat dipilih kembali oleh pengunjung lain.`,
    ``,
    `📍 *Lokasi:* ${order.event.venueName}`,
    `🗓 *Jadwal Acara:* ${formatDateTime(order.event.startsAt)}`,
    ``,
    `Jika Anda masih berminat menghadiri acara ini, silakan pilih kursi kembali melalui tautan berikut:`,
    `${baseUrl}/e/${order.event.slug}/beli`,
    ``,
    `_Pesan ini dikirim otomatis oleh sistem GateIn._`,
  ].join("\n");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 7000);

  try {
    const form = new URLSearchParams();
    form.set("target", order.buyerPhone);
    form.set("message", message);

    const res = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        Authorization: token,
      },
      body: form,
      signal: controller.signal,
    });

    const data = (await res.json().catch(() => ({}))) as {
      status?: boolean;
      reason?: string;
      detail?: string;
    };

    const isSuccess = res.ok && data.status !== false;

    await prisma.order.update({
      where: { id: orderId },
      data: {
        expiredNotifiedAt: new Date(),
        waError: isSuccess ? null : String(data.reason || data.detail || `HTTP ${res.status}`).slice(0, 200),
      },
    });

    return isSuccess
      ? { status: "SENT" }
      : { status: "FAILED", error: String(data.reason || data.detail) };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Gagal menghubungi API Fonnte";
    await prisma.order.update({
      where: { id: orderId },
      data: {
        expiredNotifiedAt: new Date(),
        waError: errMsg.slice(0, 200),
      },
    });
    return { status: "FAILED", error: errMsg };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Kirim notifikasi penawaran tiket tersedia ke WhatsApp pembeli waiting list.
 * ATURAN KERAS: Pengiriman WhatsApp bersifat non-blocking dan tidak boleh menggagalkan proses penawaran.
 */
export async function sendWaitingListOfferWhatsApp(
  entryId: string,
  requestOrigin?: string
): Promise<{ status: "SENT" | "FAILED" | "SKIPPED"; error?: string }> {
  const token = process.env.FONNTE_TOKEN?.trim();
  const entry = await prisma.waitingListEntry.findUnique({
    where: { id: entryId },
    include: {
      event: true,
      zone: true,
    },
  });

  if (!entry) {
    return { status: "FAILED", error: "Entri waiting list tidak ditemukan" };
  }

  // Cegah notifikasi berulang untuk penawaran yang sama
  if (entry.offerNotifiedAt) {
    return { status: "SKIPPED", error: "Notifikasi penawaran sudah pernah dikirim" };
  }

  if (!entry.offerExpiresAt) {
    return { status: "FAILED", error: "Batas waktu penawaran belum ditentukan" };
  }

  if (!token) {
    await prisma.waitingListEntry.update({
      where: { id: entryId },
      data: { offerNotifiedAt: new Date() },
    });
    return { status: "SKIPPED" };
  }

  const baseUrl = resolveAppBaseUrl(requestOrigin);
  const message = [
    `*TIKET TERSEDIA! — GATEIN WAITING LIST*`,
    `Halo *${entry.buyerName}*, kursi untuk acara *${entry.event.name}* kini tersedia!`,
    ``,
    `📍 *Lokasi:* ${entry.event.venueName}`,
    `🎫 *Zona:* ${entry.zone.name}`,
    `🎟 *Jumlah Tiket:* ${entry.quantity} kursi`,
    `⏳ *Batas Waktu Klaim:* Berakhir pukul ${formatDateTime(entry.offerExpiresAt)} (WIB)`,
    ``,
    `Buka tautan di bawah ini untuk memilih kursi dan menyelesaikan reservasi:`,
    `${baseUrl}/offer/${entry.token}`,
    ``,
    `_Catatan: Segera konfirmasi pemesanan Anda. Jika batas waktu habis, penawaran akan otomatis dialihkan ke kandidat antrean berikutnya._`,
  ].join("\n");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 7000);

  try {
    const form = new URLSearchParams();
    form.set("target", entry.buyerPhone);
    form.set("message", message);

    const res = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        Authorization: token,
      },
      body: form,
      signal: controller.signal,
    });

    const data = (await res.json().catch(() => ({}))) as {
      status?: boolean;
      reason?: string;
      detail?: string;
    };

    const isSuccess = res.ok && data.status !== false;

    await prisma.waitingListEntry.update({
      where: { id: entryId },
      data: {
        offerNotifiedAt: new Date(),
      },
    });

    return isSuccess
      ? { status: "SENT" }
      : { status: "FAILED", error: String(data.reason || data.detail) };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Gagal menghubungi API Fonnte";
    await prisma.waitingListEntry.update({
      where: { id: entryId },
      data: {
        offerNotifiedAt: new Date(),
      },
    });
    return { status: "FAILED", error: errMsg };
  } finally {
    clearTimeout(timer);
  }
}
