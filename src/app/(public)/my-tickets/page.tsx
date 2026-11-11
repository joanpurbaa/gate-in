import Link from "next/link";
import {
  Calendar,
  Clock,
  ExternalLink,
  MapPin,
  QrCode,
  Ticket,
  ArrowRight,
} from "lucide-react";
import { getCurrentUserSession } from "@/lib/user-auth";
import { prisma } from "@/lib/db";
import { formatRupiah } from "@/lib/money";
import { formatDateTime } from "@/lib/time";
import { MyTicketsClientAuth } from "./MyTicketsClientAuth";

export const dynamic = "force-dynamic";

export default async function MyTicketsPage() {
  const session = await getCurrentUserSession();

  if (!session?.user) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-12">
        <div className="mx-auto max-w-md rounded-2xl border border-line bg-card p-6 sm:p-8 text-center shadow-xs">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gate/10 text-gate mb-4">
            <Ticket className="h-7 w-7" />
          </div>
          <h1 className="font-display text-xl font-bold text-ink">
            Tiket Saya
          </h1>
          <p className="mt-2 text-xs text-muted leading-relaxed">
            Masuk atau buat akun GateIn untuk melihat seluruh pesanan tiket, denah kursi, dan kode QR Anda kapan saja.
          </p>

          <div className="mt-6">
            <MyTicketsClientAuth />
          </div>

          <div className="mt-6 border-t border-line pt-4 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink"
            >
              <span>Kembali ke Beranda</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Ambil semua pesanan milik pengguna
  const orders = await prisma.order.findMany({
    where: { userId: session.user.id },
    include: {
      event: true,
      seats: {
        include: { zone: true },
      },
      tickets: {
        include: {
          seat: {
            include: { zone: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const now = new Date();

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      {/* Profil Bar Pengguna */}
      <div className="mb-8 flex flex-col gap-4 rounded-2xl border border-line bg-card p-5 sm:flex-row sm:items-center sm:justify-between shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gate font-display text-lg font-bold text-white shadow-xs">
            {session.user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={session.user.image}
                alt={session.user.name || "Foto profil"}
                className="h-12 w-12 rounded-full object-cover"
              />
            ) : (
              (session.user.name || session.user.email || "U")
                .charAt(0)
                .toUpperCase()
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-lg font-bold text-ink">
                {session.user.name || "Pengguna GateIn"}
              </h1>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                Terverifikasi
              </span>
            </div>
            <p className="text-xs text-muted">{session.user.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <MyTicketsClientAuth loggedIn />
        </div>
      </div>

      {/* Header Bagian Tiket */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-ink">
            Daftar Pesanan & Tiket
          </h2>
          <p className="text-xs text-muted">
            Semua riwayat pembelian tiket acara yang terhubung dengan akun Anda
          </p>
        </div>
        <span className="rounded-full bg-page px-3 py-1 text-xs font-semibold text-ink border border-line">
          Total: {orders.length} Pesanan
        </span>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-card p-10 text-center">
          <Ticket className="mx-auto h-10 w-10 text-muted/60" />
          <h3 className="mt-3 font-display text-base font-bold text-ink">
            Belum ada tiket
          </h3>
          <p className="mt-1 text-xs text-muted max-w-sm mx-auto">
            Anda belum pernah memesan tiket. Jelajahi berbagai acara menarik di Summarecon Mall Bandung dan pesan kursi favorit Anda!
          </p>
          <div className="mt-5">
            <Link
              href="/#daftar-acara"
              className="inline-flex items-center gap-2 rounded-button bg-gate px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-gate-strong transition"
            >
              <span>Jelajahi Acara Sekarang</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const isPendingValid = order.status === "PENDING" && order.holdExpiresAt > now;
            const isExpired = order.status === "EXPIRED" || (order.status === "PENDING" && order.holdExpiresAt <= now);
            const isPaid = order.status === "PAID";

            return (
              <div
                key={order.id}
                className="overflow-hidden rounded-2xl border border-line bg-card shadow-2xs transition hover:shadow-xs"
              >
                {/* Header Kartu Pesanan */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-page/60 px-5 py-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-ink">#{order.id}</span>
                    <span className="text-muted">•</span>
                    <span className="text-muted">
                      {new Date(order.createdAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {isPaid && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Lunas & Siap Dipakai
                      </span>
                    )}
                    {isPendingValid && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 border border-amber-200 animate-pulse">
                        <Clock className="h-3 w-3" />
                        Menunggu Pembayaran
                      </span>
                    )}
                    {isExpired && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-bold text-rose-700 border border-rose-200">
                        Kadaluwarsa
                      </span>
                    )}
                  </div>
                </div>

                {/* Konten Detail Pesanan */}
                <div className="p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <Link
                        href={`/e/${order.event.slug}`}
                        className="font-display text-base font-bold text-ink hover:text-gate transition"
                      >
                        {order.event.name}
                      </Link>

                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-gate" />
                          {formatDateTime(order.event.startsAt)}
                        </span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-gate" />
                          {order.event.venueName}
                        </span>
                      </div>

                      {/* Kursi yang Dipesan */}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {order.seats.map((seat) => (
                          <span
                            key={seat.label}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-page px-2.5 py-1 text-xs font-semibold text-ink"
                          >
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{
                                backgroundColor: seat.zone?.color || "#2b2be8",
                              }}
                            />
                            <span>Kursi {seat.label}</span>
                            {seat.zone && (
                              <span className="text-[10px] text-muted">
                                ({seat.zone.name})
                              </span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col items-start gap-1 sm:items-end">
                      <span className="text-[11px] text-muted">Total Pembayaran</span>
                      <span className="font-display text-base font-bold text-gate">
                        {formatRupiah(order.totalAmount)}
                      </span>
                      {order.discountAmount > 0 && (
                        <span className="text-[11px] text-emerald-600 font-medium">
                          Hemat {formatRupiah(order.discountAmount)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Tombol Aksi */}
                  <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line/70 pt-4">
                    {isPaid && (
                      <Link
                        href={`/pesanan/${order.id}`}
                        className="inline-flex items-center gap-1.5 rounded-button bg-gate px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-gate-strong transition"
                      >
                        <QrCode className="h-3.5 w-3.5" />
                        <span>Buka E-Ticket & QR Code</span>
                      </Link>
                    )}

                    {isPendingValid && (
                      <Link
                        href={`/bayar/${order.id}`}
                        className="inline-flex items-center gap-1.5 rounded-button bg-amber-500 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-amber-600 transition"
                      >
                        <Clock className="h-3.5 w-3.5" />
                        <span>Lanjutkan Pembayaran</span>
                      </Link>
                    )}

                    <Link
                      href={`/e/${order.event.slug}`}
                      className="inline-flex items-center gap-1 rounded-button border border-line bg-card px-3.5 py-2 text-xs font-semibold text-muted hover:bg-page hover:text-ink transition"
                    >
                      <span>Lihat Halaman Acara</span>
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
