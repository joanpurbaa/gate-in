/**
 * Sistem event internal pelepasan kursi untuk integrasi modul waiting list.
 * Ketika kursi dilepaskan (expired, batal, atau gagal), event ini di-dispatch
 * agar sistem waiting list dapat menginformasikan ketersediaan kursi kepada calon
 * pembeli di masa depan tanpa mengalokasikan kursi secara sepihak.
 */

export interface ReleasedSeatInfo {
  id: string;
  label: string;
  zoneId: string | null;
}

export interface SeatsReleasedEvent {
  eventId: string;
  orderId?: string;
  reason: "EXPIRED" | "CANCELLED" | "FAILED" | "MANUAL";
  releasedSeats: ReleasedSeatInfo[];
  timestamp: Date;
}

export type SeatsReleasedListener = (
  event: SeatsReleasedEvent
) => void | Promise<void>;

const listeners: SeatsReleasedListener[] = [];

/**
 * Mendaftarkan subscriber untuk event kursi dilepaskan (misal modul waiting list).
 * Mengembalikan fungsi unsubscribe.
 */
export function subscribeToSeatsReleased(listener: SeatsReleasedListener): () => void {
  listeners.push(listener);
  return () => {
    const idx = listeners.indexOf(listener);
    if (idx !== -1) listeners.splice(idx, 1);
  };
}

/**
 * Dispatch event pelepasan kursi ke seluruh subscriber terdaftar.
 */
export async function dispatchSeatsReleased(event: SeatsReleasedEvent): Promise<void> {
  const seatLabels = event.releasedSeats.map((s) => s.label).join(", ");
  console.log(
    `[SeatEvent:WaitingListHook] Acara ${event.eventId}: ${event.releasedSeats.length} kursi dilepas (${event.reason}): [${seatLabels}] pada ${event.timestamp.toISOString()}`
  );

  for (const listener of listeners) {
    try {
      await listener(event);
    } catch (err) {
      console.error("[SeatEvent:WaitingListHook] Error pada listener subscriber:", err);
    }
  }
}

// Auto-subscribe Smart Waiting List matcher agar segera dieksekusi saat ada kursi dilepas
subscribeToSeatsReleased(async (event) => {
  try {
    const { matchWaitingListForEvent } = await import("../waiting-list/matcher.ts");
    await matchWaitingListForEvent(event.eventId);
  } catch (err) {
    console.error("[SeatEvent:WaitingListHook] Gagal mencocokkan waiting list:", err);
  }
});
