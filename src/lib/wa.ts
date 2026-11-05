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
