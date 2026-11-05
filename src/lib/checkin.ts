import { prisma } from "./db.ts";
import { formatDateTime, formatTimeRange } from "./time.ts";

export type CheckinOutcome =
  | {
      result: "VALID";
      message: string;
      outsideGateWarning: string | null;
      ticket: {
        code: string;
        seatLabel: string;
        zoneName: string;
        buyerName: string;
        checkedInAt: string;
      };
    }
  | {
      result: "ALREADY_USED";
      message: string;
      firstCheckedInAt: string | null;
      firstCheckedInFormatted: string;
      ticket: {
        code: string;
        seatLabel: string;
        zoneName: string;
        buyerName: string;
      };
    }
  | {
      result: "INVALID";
      message: string;
      code: string;
    };

/**
 * Check-in tiket secara atomik dengan satu pernyataan SQL `UPDATE ... WHERE status = 'VALID'`.
 * Menghasilkan tepat tiga kemungkinan: VALID, ALREADY_USED, atau INVALID.
 */
export async function verifyAndCheckInTicket(params: {
  eventId: string;
  code: string;
  organizerId: string;
}): Promise<CheckinOutcome> {
  const normalizedCode = params.code.trim().toUpperCase();
  if (!normalizedCode) {
    return {
      result: "INVALID",
      message: "Kode tiket kosong",
      code: "",
    };
  }

  const now = new Date();

  // Satu statement UPDATE atomik: hanya 1 request paralel yang bisa mengubah VALID -> USED
  const updatedRows = await prisma.$queryRaw<{ id: string; checkedInAt: Date }[]>`
    UPDATE "Ticket"
    SET "status" = 'USED'::"TicketStatus",
        "checkedInAt" = ${now},
        "checkedInBy" = ${params.organizerId}
    WHERE "code" = ${normalizedCode}
      AND "eventId" = ${params.eventId}
      AND "status" = 'VALID'::"TicketStatus"
    RETURNING "id", "checkedInAt"
  `;

  if (updatedRows.length === 1) {
    const fullTicket = await prisma.ticket.findUniqueOrThrow({
      where: { id: updatedRows[0].id },
      include: {
        order: { select: { buyerName: true } },
        event: { select: { gateOpenAt: true, gateCloseAt: true } },
        seat: {
          include: { zone: { select: { name: true } } },
        },
      },
    });

    const isOutsideGate =
      now < fullTicket.event.gateOpenAt || now > fullTicket.event.gateCloseAt;

    return {
      result: "VALID",
      message: "Tiket sah — Peserta berhasil check-in!",
      outsideGateWarning: isOutsideGate
        ? `Check-in dilakukan di luar jam open gate (${formatTimeRange(
            fullTicket.event.gateOpenAt,
            fullTicket.event.gateCloseAt
          )}).`
        : null,
      ticket: {
        code: fullTicket.code,
        seatLabel: fullTicket.seat.label,
        zoneName: fullTicket.seat.zone?.name ?? "Reguler",
        buyerName: fullTicket.order.buyerName,
        checkedInAt: updatedRows[0].checkedInAt.toISOString(),
      },
    };
  }

  // Jika 0 baris berubah, periksa apakah tiket ada di event ini dan sudah USED
  const existing = await prisma.ticket.findFirst({
    where: {
      code: normalizedCode,
      eventId: params.eventId,
    },
    include: {
      order: { select: { buyerName: true } },
      seat: {
        include: { zone: { select: { name: true } } },
      },
    },
  });

  if (existing && existing.status === "USED") {
    return {
      result: "ALREADY_USED",
      message: "Tiket ini sudah pernah digunakan untuk check-in sebelumnya.",
      firstCheckedInAt: existing.checkedInAt?.toISOString() ?? null,
      firstCheckedInFormatted: existing.checkedInAt
        ? formatDateTime(existing.checkedInAt)
        : "Waktu tidak tercatat",
      ticket: {
        code: existing.code,
        seatLabel: existing.seat.label,
        zoneName: existing.seat.zone?.name ?? "Reguler",
        buyerName: existing.order.buyerName,
      },
    };
  }

  return {
    result: "INVALID",
    message: "Kode tiket tidak ditemukan atau bukan milik acara ini.",
    code: normalizedCode,
  };
}
