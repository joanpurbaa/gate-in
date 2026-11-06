"use client";

import { useState } from "react";
import { Users } from "lucide-react";
import { WaitingListModal } from "./WaitingListModal";

interface ZoneItem {
  id: string;
  name: string;
  color: string;
  price: number;
  available: number;
  total: number;
}

interface EventDetailWaitingListProps {
  event: {
    id: string;
    slug: string;
    name: string;
    maxSeatsPerOrder: number;
  };
  zones: ZoneItem[];
  isSoldOut: boolean;
}

export function EventDetailWaitingList({
  event,
  zones,
  isSoldOut,
}: EventDetailWaitingListProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedZoneId, setSelectedZoneId] = useState<string | undefined>(
    undefined
  );

  const openWithZone = (zoneId?: string) => {
    setSelectedZoneId(zoneId);
    setIsOpen(true);
  };

  const hasSoldOutZones = zones.some((z) => z.available === 0);

  return (
    <>
      {/* Jika ada zona yang habis, tapi event masih ada zona lain, tampilkan banner ajakan waiting list */}
      {!isSoldOut && hasSoldOutZones && (
        <div className="mt-4 flex items-center justify-between rounded-xl border border-gate/20 bg-gate/5 p-3.5">
          <div className="flex items-center gap-2.5">
            <Users className="h-4 w-4 text-gate shrink-0" />
            <span className="text-xs text-ink font-medium">
              Zona favoritmu sudah habis? Masuk waiting list untuk mendapat prioritas kursi.
            </span>
          </div>
          <button
            type="button"
            onClick={() => openWithZone()}
            className="rounded-lg bg-gate px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-gate-strong"
          >
            Masuk Waiting List
          </button>
        </div>
      )}

      {/* Jika seluruh tiket acara sold out, tampilkan CTA Waiting list */}
      {isSoldOut && (
        <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-50/60 p-4 text-center dark:bg-amber-950/20">
          <h3 className="font-display text-sm font-bold text-ink">
            Tiket Habis Terjual?
          </h3>
          <p className="mt-1 text-xs text-muted max-w-md mx-auto">
            Daftarkan diri Anda ke dalam Smart Waiting List. Jika ada pesanan yang
            kedaluwarsa atau dibatalkan, GateIn akan segera mengirimkan penawaran tiket
            ke WhatsApp Anda.
          </p>
          <div className="mt-3">
            <button
              type="button"
              onClick={() => openWithZone()}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-gate px-5 text-xs font-semibold text-white shadow-sm transition hover:bg-gate-strong"
            >
              <Users className="h-4 w-4" />
              <span>Masuk Waiting List Acara Ini</span>
            </button>
          </div>
        </div>
      )}

      <WaitingListModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        event={event}
        zones={zones}
        initialZoneId={selectedZoneId}
      />
    </>
  );
}
