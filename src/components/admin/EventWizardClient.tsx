"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Lock,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  Wand2,
} from "lucide-react";
import { SeatMap } from "@/components/seatmap/SeatMap";
import {
  ZONE_COLOR_PALETTE,
  type SeatMapItem,
  type SeatZoneInfo,
} from "@/components/seatmap/types";
import { distributeSeatsToRings } from "@/lib/layout/circle";
import { buildLayout, generateAllSeats, layoutToSeats } from "@/lib/layout/generate";
import type { GridStagePosition, LayoutGenerator } from "@/lib/layout/types";
import { formatRupiah } from "@/lib/money";
import { fromWibInputValue, toWibInputValue } from "@/lib/time";

export interface WizardZoneItem {
  clientId: string;
  name: string;
  color: string;
  price: number;
}

export interface EventWizardInitialData {
  id?: string;
  name: string;
  slug?: string;
  description: string;
  posterUrl: string | null;
  venueName: string;
  venueAddress: string | null;
  startsAt: string;
  gateOpenAt: string;
  gateCloseAt: string;
  salesOpenAt: string;
  salesCloseAt: string;
  maxSeatsPerOrder: number;
  contactInfo: string | null;
  policyNote: string | null;
  status: "DRAFT" | "PUBLISHED";
  layoutLocked: boolean;
  stageLabel: string;
  generator: LayoutGenerator | null;
  zones: WizardZoneItem[];
  seatZoneByLabel: Record<string, string>;
}

/** Kompres gambar di sisi klien ke JPEG <= 1280px agar hemat bandwidth (< 1 MB) */
async function compressImageFile(
  file: File,
  maxDimension = 1280,
  quality = 0.8
): Promise<{ base64: string; mimeType: string; blob: Blob }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Gagal membaca file gambar"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Format gambar tidak didukung"));
      img.onload = () => {
        const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Gagal menyiapkan kanvas kompresi"));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        const base64 = dataUrl.split(",")[1] ?? "";
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Gagal mengompresi gambar"));
              return;
            }
            resolve({ base64, mimeType: "image/jpeg", blob });
          },
          "image/jpeg",
          quality
        );
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export function EventWizardClient({ initial }: { initial: EventWizardInitialData }) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Langkah 1: Info Dasar
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [posterUrl, setPosterUrl] = useState(initial.posterUrl ?? "");
  const [uploadingPoster, setUploadingPoster] = useState(false);
  const [venueName, setVenueName] = useState(initial.venueName);
  const [venueAddress, setVenueAddress] = useState(initial.venueAddress ?? "");
  const [startsAtWib, setStartsAtWib] = useState(() => toWibInputValue(initial.startsAt));
  const [gateOpenAtWib, setGateOpenAtWib] = useState(() => toWibInputValue(initial.gateOpenAt));
  const [gateCloseAtWib, setGateCloseAtWib] = useState(() => toWibInputValue(initial.gateCloseAt));
  const [salesOpenAtWib, setSalesOpenAtWib] = useState(() => toWibInputValue(initial.salesOpenAt));
  const [salesCloseAtWib, setSalesCloseAtWib] = useState(() =>
    toWibInputValue(initial.salesCloseAt)
  );
  const [maxSeatsPerOrder, setMaxSeatsPerOrder] = useState(initial.maxSeatsPerOrder);
  const [contactInfo, setContactInfo] = useState(initial.contactInfo ?? "");
  const [policyNote, setPolicyNote] = useState(initial.policyNote ?? "");

  // Langkah 2: Layout Kursi
  const initGen = initial.generator;
  const [layoutType, setLayoutType] = useState<"grid" | "circle">(
    initGen?.type === "circle" ? "circle" : "grid"
  );
  const [stageLabel, setStageLabel] = useState(initial.stageLabel || "PANGGUNG");

  // Parameter Grid
  const [gridRows, setGridRows] = useState(
    initGen?.type === "grid" ? initGen.params.rows : 10
  );
  const [gridCols, setGridCols] = useState(
    initGen?.type === "grid" ? initGen.params.cols : 15
  );
  const [rowLabelStyle, setRowLabelStyle] = useState<"alpha" | "numeric">(
    initGen?.type === "grid" ? initGen.params.rowLabelStyle : "alpha"
  );
  const [aisleAfterColsText, setAisleAfterColsText] = useState(
    initGen?.type === "grid" ? initGen.params.aisleAfterCols.join(", ") : "8"
  );
  const [aisleAfterRowsText, setAisleAfterRowsText] = useState(
    initGen?.type === "grid" ? initGen.params.aisleAfterRows.join(", ") : ""
  );
  const [stagePosition, setStagePosition] = useState<GridStagePosition>(
    initGen?.type === "grid" ? initGen.params.stagePosition : "top"
  );

  // Parameter Circle
  const [circleRings, setCircleRings] = useState(
    initGen?.type === "circle" ? initGen.params.rings : 3
  );
  const [seatsPerRingText, setSeatsPerRingText] = useState(
    initGen?.type === "circle" ? initGen.params.seatsPerRing.join(", ") : "24, 32, 40"
  );
  const [circleAisleGaps, setCircleAisleGaps] = useState(
    initGen?.type === "circle" ? initGen.params.aisleGaps : 2
  );
  const [circleGapSize, setCircleGapSize] = useState(
    initGen?.type === "circle" ? initGen.params.gapSizeSeats : 2
  );

  const [removedLabels, setRemovedLabels] = useState<string[]>(
    initGen?.removedLabels ?? []
  );

  // Panel AI Layout
  const [aiDescription, setAiDescription] = useState("");
  const [aiPhotoFile, setAiPhotoFile] = useState<File | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiWarnings, setAiWarnings] = useState<string[]>([]);
  const [aiQuestions, setAiQuestions] = useState<string[]>([]);
  const [aiBanner, setAiBanner] = useState<string | null>(null);

  // Langkah 3: Zona & Harga
  const [zones, setZones] = useState<WizardZoneItem[]>(
    initial.zones.length > 0
      ? initial.zones
      : [
          { clientId: "zone_vip", name: "VIP", color: ZONE_COLOR_PALETTE[0].hex, price: 150000 },
          { clientId: "zone_reg", name: "Reguler", color: ZONE_COLOR_PALETTE[2].hex, price: 75000 },
        ]
  );
  const [activeZoneId, setActiveZoneId] = useState<string>(
    initial.zones[0]?.clientId ?? "zone_vip"
  );
  const [seatZoneByLabel, setSeatZoneByLabel] = useState<Record<string, string>>(
    initial.seatZoneByLabel
  );
  const [rowFrom, setRowFrom] = useState("");
  const [rowTo, setRowTo] = useState("");

  // Simpan & Publish
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  const parseNumberList = (txt: string, maxVal: number): number[] =>
    Array.from(
      new Set(
        txt
          .split(",")
          .map((s) => Number.parseInt(s.trim(), 10))
          .filter((n) => Number.isFinite(n) && n >= 1 && n < maxVal)
      )
    ).sort((a, b) => a - b);

  const generator: LayoutGenerator = useMemo(() => {
    if (layoutType === "grid") {
      const r = Math.max(1, Math.min(60, gridRows || 1));
      const c = Math.max(1, Math.min(60, gridCols || 1));
      return {
        type: "grid",
        params: {
          rows: r,
          cols: c,
          rowLabelStyle,
          aisleAfterCols: parseNumberList(aisleAfterColsText, c),
          aisleAfterRows: parseNumberList(aisleAfterRowsText, r),
          stagePosition,
        },
        removedLabels,
      };
    }
    const r = Math.max(1, Math.min(8, circleRings || 1));
    const parsedRings = seatsPerRingText
      .split(",")
      .map((s) => Number.parseInt(s.trim(), 10))
      .filter((n) => Number.isFinite(n) && n >= 1 && n <= 400);
    const ringCounts = Array.from(
      { length: r },
      (_, idx) => parsedRings[idx] ?? 20 + idx * 8
    );
    const gaps = Math.max(0, Math.min(8, circleAisleGaps || 0));
    const safeCounts = ringCounts.map((cnt) => Math.max(cnt, gaps || 1));
    return {
      type: "circle",
      params: {
        rings: r,
        seatsPerRing: safeCounts,
        aisleGaps: gaps,
        gapSizeSeats: Math.max(1, Math.min(4, circleGapSize || 1)),
        startAngleDeg: -90,
      },
      removedLabels,
    };
  }, [
    layoutType,
    gridRows,
    gridCols,
    rowLabelStyle,
    aisleAfterColsText,
    aisleAfterRowsText,
    stagePosition,
    circleRings,
    seatsPerRingText,
    circleAisleGaps,
    circleGapSize,
    removedLabels,
  ]);

  const layout = useMemo(
    () => buildLayout(generator, { stageLabel }),
    [generator, stageLabel]
  );

  const allSeatsWithRemoved = useMemo(() => generateAllSeats(generator), [generator]);
  const activeSeats = useMemo(() => layoutToSeats(layout), [layout]);

  const distinctRows = useMemo(() => {
    const list: string[] = [];
    const seen = new Set<string>();
    for (const s of activeSeats) {
      if (!seen.has(s.rowLabel)) {
        seen.add(s.rowLabel);
        list.push(s.rowLabel);
      }
    }
    return list;
  }, [activeSeats]);

  const seatMapItems: SeatMapItem[] = useMemo(() => {
    const removedSet = new Set(removedLabels);
    return allSeatsWithRemoved.map((s) => ({
      ...s,
      status: "AVAILABLE" as const,
      zoneId: seatZoneByLabel[s.label] ?? null,
      removed: removedSet.has(s.label),
    }));
  }, [allSeatsWithRemoved, removedLabels, seatZoneByLabel]);

  const seatMapZones: SeatZoneInfo[] = useMemo(
    () =>
      zones.map((z) => ({
        id: z.clientId,
        name: z.name,
        color: z.color,
        price: z.price,
      })),
    [zones]
  );

  const validZoneIds = useMemo(() => new Set(zones.map((z) => z.clientId)), [zones]);
  const unassignedCount = useMemo(
    () =>
      activeSeats.filter((s) => {
        const zId = seatZoneByLabel[s.label];
        return !zId || !validZoneIds.has(zId);
      }).length,
    [activeSeats, seatZoneByLabel, validZoneIds]
  );

  const handleToggleSeatRemove = (seat: SeatMapItem) => {
    if (initial.layoutLocked) return;
    setRemovedLabels((prev) =>
      prev.includes(seat.label) ? prev.filter((l) => l !== seat.label) : [...prev, seat.label]
    );
  };

  const handleToggleSeatZone = (seat: SeatMapItem) => {
    if (seat.removed || !activeZoneId) return;
    setSeatZoneByLabel((prev) => ({
      ...prev,
      [seat.label]: activeZoneId,
    }));
  };

  const applyZoneToRowRange = () => {
    if (!activeZoneId || distinctRows.length === 0) return;
    const startIdx = distinctRows.indexOf(rowFrom || distinctRows[0]);
    const endIdx = distinctRows.indexOf(rowTo || rowFrom || distinctRows[0]);
    if (startIdx === -1 || endIdx === -1) return;
    const minIdx = Math.min(startIdx, endIdx);
    const maxIdx = Math.max(startIdx, endIdx);
    const targetRows = new Set(distinctRows.slice(minIdx, maxIdx + 1));

    setSeatZoneByLabel((prev) => {
      const next = { ...prev };
      for (const s of activeSeats) {
        if (targetRows.has(s.rowLabel)) {
          next[s.label] = activeZoneId;
        }
      }
      return next;
    });
  };

  const applyZoneToAllUnassigned = () => {
    if (!activeZoneId) return;
    setSeatZoneByLabel((prev) => {
      const next = { ...prev };
      for (const s of activeSeats) {
        if (!next[s.label] || !validZoneIds.has(next[s.label])) {
          next[s.label] = activeZoneId;
        }
      }
      return next;
    });
  };

  const handleAnalyzeWithAi = async () => {
    if (initial.layoutLocked) return;
    if (!aiDescription.trim() && !aiPhotoFile) {
      setAiBanner("Masukkan deskripsi susunan kursi atau unggah foto ruangan terlebih dahulu.");
      return;
    }
    setAiLoading(true);
    setAiBanner(null);
    setAiWarnings([]);
    setAiQuestions([]);

    try {
      let imageBase64: string | undefined;
      let imageMimeType: string | undefined;
      if (aiPhotoFile) {
        const compressed = await compressImageFile(aiPhotoFile, 1280, 0.8);
        imageBase64 = compressed.base64;
        imageMimeType = compressed.mimeType;
      }

      const res = await fetch("/api/admin/layout/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: aiDescription.trim(),
          imageBase64,
          imageMimeType,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setAiBanner(
          data.error ||
            "AI sedang bermasalah, silakan gunakan template manual di bawah."
        );
        return;
      }

      setAiWarnings(Array.isArray(data.warnings) ? data.warnings : []);
      setAiQuestions(Array.isArray(data.questions) ? data.questions : []);

      if (data.type === "unsupported") {
        setAiBanner(
          "Bentuk ruangan tidak termasuk Grid atau Melingkar. Kami mengarahkan ke template terdekat di bawah — silakan sesuaikan angkanya."
        );
        if (data.suggestedFallback === "circle") {
          setLayoutType("circle");
        } else {
          setLayoutType("grid");
        }
        return;
      }

      if (data.stage?.label) {
        setStageLabel(data.stage.label);
      }

      if (data.type === "grid" && data.params) {
        setLayoutType("grid");
        if (data.params.rows) setGridRows(data.params.rows);
        if (data.params.cols) setGridCols(data.params.cols);
        if (data.params.rowLabelStyle) setRowLabelStyle(data.params.rowLabelStyle);
        if (Array.isArray(data.params.aisleAfterCols)) {
          setAisleAfterColsText(data.params.aisleAfterCols.join(", "));
        }
        if (Array.isArray(data.params.aisleAfterRows)) {
          setAisleAfterRowsText(data.params.aisleAfterRows.join(", "));
        }
        if (data.params.stagePosition) {
          setStagePosition(data.params.stagePosition);
        }
        setRemovedLabels([]);
        setAiBanner("Parameter layout Grid berhasil disusun oleh AI. Periksa preview di bawah!");
      } else if (data.type === "circle" && data.params) {
        setLayoutType("circle");
        const r = data.params.rings || 3;
        setCircleRings(r);
        if (Array.isArray(data.params.seatsPerRing) && data.params.seatsPerRing.length === r) {
          setSeatsPerRingText(data.params.seatsPerRing.join(", "));
        } else if (data.params.totalSeats) {
          setSeatsPerRingText(distributeSeatsToRings(data.params.totalSeats, r).join(", "));
        }
        if (typeof data.params.aisleGaps === "number") setCircleAisleGaps(data.params.aisleGaps);
        if (typeof data.params.gapSizeSeats === "number") setCircleGapSize(data.params.gapSizeSeats);
        setRemovedLabels([]);
        setAiBanner(
          "Parameter layout Melingkar berhasil disusun oleh AI. Periksa preview di bawah!"
        );
      }
    } catch {
      setAiBanner("AI sedang bermasalah, silakan gunakan template manual di bawah.");
    } finally {
      setAiLoading(false);
    }
  };

  const handlePosterUpload = async (file: File) => {
    setUploadingPoster(true);
    setErrorMsg(null);
    try {
      const compressed = await compressImageFile(file, 1400, 0.85);
      const form = new FormData();
      form.append("file", compressed.blob, file.name.replace(/\.[^.]+$/, ".jpg"));

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Gagal mengunggah poster");
        return;
      }
      setPosterUrl(data.url);
      setInfoMsg("Poster berhasil diunggah ke Vercel Blob.");
    } catch {
      setErrorMsg("Gagal mengunggah poster.");
    } finally {
      setUploadingPoster(false);
    }
  };

  const handleSave = async (targetStatus: "DRAFT" | "PUBLISHED") => {
    setSaving(true);
    setErrorMsg(null);
    setInfoMsg(null);

    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        posterUrl: posterUrl.trim() ? posterUrl.trim() : null,
        venueName: venueName.trim(),
        venueAddress: venueAddress.trim() ? venueAddress.trim() : null,
        startsAt: fromWibInputValue(startsAtWib).toISOString(),
        gateOpenAt: fromWibInputValue(gateOpenAtWib).toISOString(),
        gateCloseAt: fromWibInputValue(gateCloseAtWib).toISOString(),
        salesOpenAt: fromWibInputValue(salesOpenAtWib).toISOString(),
        salesCloseAt: fromWibInputValue(salesCloseAtWib).toISOString(),
        maxSeatsPerOrder,
        contactInfo: contactInfo.trim() ? contactInfo.trim() : null,
        policyNote: policyNote.trim() ? policyNote.trim() : null,
        status: targetStatus,
        stageLabel: stageLabel.trim() || "PANGGUNG",
        generator,
        zones,
        seatZoneByLabel,
      };

      const url = initial.id ? `/api/admin/events/${initial.id}` : "/api/admin/events";
      const method = initial.id ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Gagal menyimpan acara");
        setSaving(false);
        return;
      }

      router.push(`/admin/events/${data.event.id}`);
      router.refresh();
    } catch {
      setErrorMsg("Gagal menghubungi server.");
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 pb-20">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Kembali ke Dashboard</span>
          </Link>
          <h1 className="mt-1 text-xl font-bold text-ink sm:text-2xl">
            {initial.id ? `Kelola Acara: ${name || initial.name}` : "Buat Acara Baru"}
          </h1>
        </div>

        {/* Stepper */}
        <ol className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
          {(
            [
              { n: 1, label: "1. Info Dasar" },
              { n: 2, label: "2. Layout Kursi" },
              { n: 3, label: "3. Zona & Harga" },
              { n: 4, label: "4. Review & Publish" },
            ] as const
          ).map((item) => (
            <li key={item.n}>
              <button
                type="button"
                onClick={() => setStep(item.n)}
                className={`rounded-xl px-3 py-2 transition ${
                  step === item.n
                    ? "bg-gate text-white shadow-xs"
                    : "border border-line bg-white text-ink hover:bg-page"
                }`}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ol>
      </div>

      {errorMsg && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-900">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {infoMsg && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-900">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{infoMsg}</span>
        </div>
      )}

      {/* ===================================================================== */}
      {/* LANGKAH 1: INFO DASAR                                                 */}
      {/* ===================================================================== */}
      {step === 1 && (
        <section className="rounded-2xl border border-line bg-white p-5 shadow-xs sm:p-6">
          <h2 className="text-base font-bold text-ink">Informasi Dasar & Jadwal Acara</h2>
          <p className="text-xs text-muted">
            Seluruh jadwal diinput dalam Waktu Indonesia Barat (WIB) dan disimpan UTC di database.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-ink">Nama Acara *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Bandung Tech Summit 2026"
                className="mt-1 min-h-11 w-full rounded-xl border border-line px-3.5 py-2 text-sm"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-ink">Deskripsi Acara</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Jelaskan garis besar acara, pengisi acara, dan fasilitas peserta..."
                className="mt-1 w-full rounded-xl border border-line px-3.5 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink">
                Nama Venue / Ruangan *
              </label>
              <input
                type="text"
                required
                value={venueName}
                onChange={(e) => setVenueName(e.target.value)}
                placeholder="Contoh: Convention Hall Lt. 2, Summarecon Mall Bandung"
                className="mt-1 min-h-11 w-full rounded-xl border border-line px-3.5 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink">Alamat Venue</label>
              <input
                type="text"
                value={venueAddress}
                onChange={(e) => setVenueAddress(e.target.value)}
                placeholder="Jl. Grand Bulevar No. 1, Gedebage, Kota Bandung"
                className="mt-1 min-h-11 w-full rounded-xl border border-line px-3.5 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink">
                Tanggal & Jam Mulai Acara (WIB) *
              </label>
              <input
                type="datetime-local"
                value={startsAtWib}
                onChange={(e) => setStartsAtWib(e.target.value)}
                className="mt-1 min-h-11 w-full rounded-xl border border-line px-3.5 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink">
                Maks. Kursi per Pesanan (1–10)
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={maxSeatsPerOrder}
                onChange={(e) =>
                  setMaxSeatsPerOrder(Math.max(1, Math.min(10, Number(e.target.value) || 5)))
                }
                className="mt-1 min-h-11 w-full rounded-xl border border-line px-3.5 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink">
                Open Gate Mulai (WIB) *
              </label>
              <input
                type="datetime-local"
                value={gateOpenAtWib}
                onChange={(e) => setGateOpenAtWib(e.target.value)}
                className="mt-1 min-h-11 w-full rounded-xl border border-line px-3.5 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink">
                Open Gate Selesai (WIB) *
              </label>
              <input
                type="datetime-local"
                value={gateCloseAtWib}
                onChange={(e) => setGateCloseAtWib(e.target.value)}
                className="mt-1 min-h-11 w-full rounded-xl border border-line px-3.5 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink">
                Penjualan Dibuka (WIB) *
              </label>
              <input
                type="datetime-local"
                value={salesOpenAtWib}
                onChange={(e) => setSalesOpenAtWib(e.target.value)}
                className="mt-1 min-h-11 w-full rounded-xl border border-line px-3.5 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink">
                Penjualan Ditutup (WIB) *
              </label>
              <input
                type="datetime-local"
                value={salesCloseAtWib}
                onChange={(e) => setSalesCloseAtWib(e.target.value)}
                className="mt-1 min-h-11 w-full rounded-xl border border-line px-3.5 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink">
                Kontak Penyelenggara
              </label>
              <input
                type="text"
                value={contactInfo}
                onChange={(e) => setContactInfo(e.target.value)}
                placeholder="WhatsApp Panitia: 0812-xxxx-xxxx"
                className="mt-1 min-h-11 w-full rounded-xl border border-line px-3.5 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink">
                Poster Acara (Opsional — URL atau Unggah Vercel Blob)
              </label>
              <div className="mt-1 flex gap-2">
                <input
                  type="url"
                  value={posterUrl}
                  onChange={(e) => setPosterUrl(e.target.value)}
                  placeholder="https://..."
                  className="min-h-11 flex-1 rounded-xl border border-line px-3.5 py-2 text-sm"
                />
                <label className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl border border-line bg-page px-3 py-2 text-xs font-semibold text-ink hover:bg-page">
                  <Upload className="h-3.5 w-3.5" />
                  <span>{uploadingPoster ? "Mengunggah..." : "Unggah"}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    disabled={uploadingPoster}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handlePosterUpload(f);
                    }}
                  />
                </label>
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-ink">
                Catatan Kebijakan Tiket / Refund
              </label>
              <input
                type="text"
                value={policyNote}
                onChange={(e) => setPolicyNote(e.target.value)}
                placeholder="Tiket yang sudah dibeli bersifat final..."
                className="mt-1 min-h-11 w-full rounded-xl border border-line px-3.5 py-2 text-sm"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-gate px-5 py-2.5 text-xs font-semibold text-white hover:bg-gate-strong"
            >
              <span>Lanjut ke Layout Kursi</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>
      )}

      {/* ===================================================================== */}
      {/* LANGKAH 2: LAYOUT KURSI                                               */}
      {/* ===================================================================== */}
      {step === 2 && (
        <section className="space-y-4">
          {initial.layoutLocked && (
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-950">
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
              <div>
                <strong className="font-bold">Struktur Layout Terkunci</strong>
                <p className="mt-0.5">
                  Acara ini sudah memiliki kursi yang ditahan atau terjual. Posisi bangku tidak
                  dapat diubah agar tiket pengunjung tetap konsisten, namun Anda masih dapat
                  mengubah info acara dan zona di langkah berikutnya.
                </p>
              </div>
            </div>
          )}

          {/* Panel AI Layout */}
          <div className="rounded-2xl border border-gate/25 bg-white p-5 shadow-xs">
            <div className="flex items-center gap-2 text-gate">
              <Wand2 className="h-5 w-5" />
              <h2 className="text-base font-bold text-ink">
                Buat Layout Otomatis dengan AI (Foto + Deskripsi)
              </h2>
            </div>
            <p className="mt-1 text-xs text-muted">
              Unggah foto ruangan (opsional) dan tulis jumlah baris/kolom atau bentuk susunan kursi.
              AI akan menghasilkan parameter terstruktur yang dapat Anda tinjau dan koreksi.
            </p>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-12">
              <div className="sm:col-span-8">
                <textarea
                  rows={2}
                  disabled={initial.layoutLocked}
                  value={aiDescription}
                  onChange={(e) => setAiDescription(e.target.value)}
                  placeholder="Contoh: Ruangan 20m x 20m, 15 baris dan 20 kolom, panggung di depan, lorong di tengah setelah kolom 10"
                  className="w-full rounded-xl border border-line px-3.5 py-2 text-xs text-ink"
                />
              </div>
              <div className="flex flex-col gap-2 sm:col-span-4">
                <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-dashed border-line bg-page px-3 py-2 text-xs font-medium text-ink hover:bg-page">
                  <Upload className="h-3.5 w-3.5 text-gate" />
                  <span className="truncate">
                    {aiPhotoFile ? aiPhotoFile.name : "Foto Ruangan (Opsional)"}
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={initial.layoutLocked}
                    className="hidden"
                    onChange={(e) => setAiPhotoFile(e.target.files?.[0] ?? null)}
                  />
                </label>

                <button
                  type="button"
                  disabled={initial.layoutLocked || aiLoading}
                  onClick={handleAnalyzeWithAi}
                  className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-gate px-4 py-2 text-xs font-semibold text-white hover:bg-gate-strong disabled:bg-line"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{aiLoading ? "Menganalisis dengan Gemini..." : "Buat dengan AI"}</span>
                </button>
              </div>
            </div>

            {aiBanner && (
              <div className="mt-3 rounded-xl border border-gate/25 bg-gate/8 px-3.5 py-2.5 text-xs font-medium text-ink">
                {aiBanner}
              </div>
            )}

            {(aiWarnings.length > 0 || aiQuestions.length > 0) && (
              <div className="mt-3 space-y-1.5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
                {aiWarnings.map((w, i) => (
                  <p key={`w-${i}`}>⚠️ Peringatan AI: {w}</p>
                ))}
                {aiQuestions.map((q, i) => (
                  <p key={`q-${i}`}>💡 Catatan AI: {q}</p>
                ))}
              </div>
            )}
          </div>

          {/* Panel Parameter Manual & Koreksi */}
          <div className="rounded-2xl border border-line bg-white p-5 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-ink">
                  Template & Parameter Layout (Dapat Dikoreksi Langsung)
                </h3>
                <p className="text-xs text-muted">
                  Total kursi aktif: <strong>{activeSeats.length}</strong> kursi (maks. 1.500).
                  Ketuk kursi pada preview di bawah untuk menghapus atau memulihkan kursi.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={initial.layoutLocked}
                  onClick={() => {
                    setLayoutType("grid");
                    setRemovedLabels([]);
                  }}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold ${
                    layoutType === "grid"
                      ? "bg-gate text-white"
                      : "border border-line bg-page text-ink"
                  }`}
                >
                  Template Grid (Baris × Kolom)
                </button>
                <button
                  type="button"
                  disabled={initial.layoutLocked}
                  onClick={() => {
                    setLayoutType("circle");
                    setRemovedLabels([]);
                  }}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold ${
                    layoutType === "circle"
                      ? "bg-gate text-white"
                      : "border border-line bg-page text-ink"
                  }`}
                >
                  Template Melingkar (360°)
                </button>
              </div>
            </div>

            {layoutType === "grid" ? (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-6">
                <label className="text-xs font-semibold text-ink">
                  Jumlah Baris (1–60)
                  <input
                    type="number"
                    min={1}
                    max={60}
                    disabled={initial.layoutLocked}
                    value={gridRows}
                    onChange={(e) => setGridRows(Number(e.target.value) || 1)}
                    className="mt-1 w-full rounded-lg border border-line px-2.5 py-1.5 text-xs"
                  />
                </label>
                <label className="text-xs font-semibold text-ink">
                  Jumlah Kolom (1–60)
                  <input
                    type="number"
                    min={1}
                    max={60}
                    disabled={initial.layoutLocked}
                    value={gridCols}
                    onChange={(e) => setGridCols(Number(e.target.value) || 1)}
                    className="mt-1 w-full rounded-lg border border-line px-2.5 py-1.5 text-xs"
                  />
                </label>
                <label className="text-xs font-semibold text-ink">
                  Lorong stlh Kolom
                  <input
                    type="text"
                    disabled={initial.layoutLocked}
                    value={aisleAfterColsText}
                    onChange={(e) => setAisleAfterColsText(e.target.value)}
                    placeholder="Mis: 10"
                    className="mt-1 w-full rounded-lg border border-line px-2.5 py-1.5 text-xs"
                  />
                </label>
                <label className="text-xs font-semibold text-ink">
                  Lorong stlh Baris
                  <input
                    type="text"
                    disabled={initial.layoutLocked}
                    value={aisleAfterRowsText}
                    onChange={(e) => setAisleAfterRowsText(e.target.value)}
                    placeholder="Mis: 5"
                    className="mt-1 w-full rounded-lg border border-line px-2.5 py-1.5 text-xs"
                  />
                </label>
                <label className="text-xs font-semibold text-ink">
                  Posisi Panggung
                  <select
                    disabled={initial.layoutLocked}
                    value={stagePosition}
                    onChange={(e) => setStagePosition(e.target.value as GridStagePosition)}
                    className="mt-1 w-full rounded-lg border border-line px-2 py-1.5 text-xs"
                  >
                    <option value="top">Atas (Depan)</option>
                    <option value="bottom">Bawah</option>
                    <option value="left">Kiri</option>
                    <option value="right">Kanan</option>
                    <option value="none">Tanpa Panggung</option>
                  </select>
                </label>
                <label className="text-xs font-semibold text-ink">
                  Label Panggung
                  <input
                    type="text"
                    disabled={initial.layoutLocked}
                    value={stageLabel}
                    onChange={(e) => setStageLabel(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-line px-2.5 py-1.5 text-xs"
                  />
                </label>
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
                <label className="text-xs font-semibold text-ink">
                  Jumlah Ring (1–8)
                  <input
                    type="number"
                    min={1}
                    max={8}
                    disabled={initial.layoutLocked}
                    value={circleRings}
                    onChange={(e) => setCircleRings(Number(e.target.value) || 1)}
                    className="mt-1 w-full rounded-lg border border-line px-2.5 py-1.5 text-xs"
                  />
                </label>
                <label className="text-xs font-semibold text-ink sm:col-span-2">
                  Kursi per Ring (pisahkan koma)
                  <input
                    type="text"
                    disabled={initial.layoutLocked}
                    value={seatsPerRingText}
                    onChange={(e) => setSeatsPerRingText(e.target.value)}
                    placeholder="24, 32, 40"
                    className="mt-1 w-full rounded-lg border border-line px-2.5 py-1.5 text-xs"
                  />
                </label>
                <label className="text-xs font-semibold text-ink">
                  Jumlah Lorong (0–8)
                  <input
                    type="number"
                    min={0}
                    max={8}
                    disabled={initial.layoutLocked}
                    value={circleAisleGaps}
                    onChange={(e) => setCircleAisleGaps(Number(e.target.value) || 0)}
                    className="mt-1 w-full rounded-lg border border-line px-2.5 py-1.5 text-xs"
                  />
                </label>
                <label className="text-xs font-semibold text-ink">
                  Label Panggung Tengah
                  <input
                    type="text"
                    disabled={initial.layoutLocked}
                    value={stageLabel}
                    onChange={(e) => setStageLabel(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-line px-2.5 py-1.5 text-xs"
                  />
                </label>
              </div>
            )}

            {removedLabels.length > 0 && (
              <div className="mt-3 flex items-center justify-between rounded-xl bg-page px-3 py-2 text-xs text-ink">
                <span>
                  Kursi dihapus manual ({removedLabels.length}):{" "}
                  <strong className="font-mono">{removedLabels.slice(0, 12).join(", ")}</strong>
                </span>
                {!initial.layoutLocked && (
                  <button
                    type="button"
                    onClick={() => setRemovedLabels([])}
                    className="font-semibold text-gate underline"
                  >
                    Pulihkan Semua
                  </button>
                )}
              </div>
            )}

            <div className="mt-4">
              <SeatMap
                layout={layout}
                seats={seatMapItems}
                zones={seatMapZones}
                mode="edit"
                onToggleSeat={handleToggleSeatRemove}
              />
            </div>

            <div className="mt-5 flex justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-line bg-white px-4 py-2 text-xs font-semibold text-ink"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Info Dasar</span>
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-gate px-5 py-2 text-xs font-semibold text-white hover:bg-gate-strong"
              >
                <span>Lanjut ke Zona & Harga</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ===================================================================== */}
      {/* LANGKAH 3: ZONA & HARGA                                               */}
      {/* ===================================================================== */}
      {step === 3 && (
        <section className="space-y-4">
          <div className="rounded-2xl border border-line bg-white p-5 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-ink">
                  Atur Kategori Zona & Harga Kursi
                </h2>
                <p className="text-xs text-muted">
                  Tetapkan zona per baris/ring secara cepat, atau ketuk kursi langsung pada denah.
                </p>
              </div>

              <span
                className={`rounded-full border px-3 py-1 text-xs font-bold ${
                  unassignedCount === 0
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-amber-300 bg-amber-50 text-amber-900"
                }`}
              >
                {unassignedCount === 0
                  ? `✔ Semua ${activeSeats.length} kursi sudah diberi zona`
                  : `${unassignedCount} kursi belum diberi zona`}
              </span>
            </div>

            {/* Daftar Zona */}
            <div className="mt-4 space-y-2.5">
              {zones.map((z, idx) => (
                <div
                  key={z.clientId}
                  onClick={() => setActiveZoneId(z.clientId)}
                  className={`flex flex-wrap items-center gap-3 rounded-xl border p-3 transition ${
                    activeZoneId === z.clientId
                      ? "border-gate bg-gate/8"
                      : "border-line bg-page"
                  }`}
                >
                  <input
                    type="radio"
                    name="activeZone"
                    checked={activeZoneId === z.clientId}
                    onChange={() => setActiveZoneId(z.clientId)}
                    className="h-4 w-4 accent-gate"
                  />

                  <input
                    type="text"
                    value={z.name}
                    onChange={(e) => {
                      const val = e.target.value;
                      setZones((prev) =>
                        prev.map((item, i) => (i === idx ? { ...item, name: val } : item))
                      );
                    }}
                    placeholder="Nama Zona (VIP / Reguler)"
                    className="min-h-9 flex-1 rounded-lg border border-line bg-white px-3 py-1 text-xs font-semibold"
                  />

                  <div className="flex items-center gap-1">
                    {ZONE_COLOR_PALETTE.map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        title={c.name}
                        onClick={() =>
                          setZones((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, color: c.hex } : item))
                          )
                        }
                        className={`h-6 w-6 rounded-md border ${
                          z.color === c.hex ? "ring-2 ring-gate ring-offset-1" : "border-black/15"
                        }`}
                        style={{ backgroundColor: c.hex }}
                      />
                    ))}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-muted">Rp</span>
                    <input
                      type="number"
                      min={0}
                      step={5000}
                      value={z.price}
                      onChange={(e) => {
                        const val = Math.max(0, Number(e.target.value) || 0);
                        setZones((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, price: val } : item))
                        );
                      }}
                      className="min-h-9 w-28 rounded-lg border border-line bg-white px-2.5 py-1 font-mono text-xs font-semibold"
                    />
                  </div>

                  {zones.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const next = zones.filter((_, i) => i !== idx);
                        setZones(next);
                        if (activeZoneId === z.clientId && next[0]) {
                          setActiveZoneId(next[0].clientId);
                        }
                      }}
                      className="rounded-lg p-1.5 text-muted hover:bg-rose-50 hover:text-rose-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}

              <button
                type="button"
                onClick={() => {
                  const id = `zone_${Date.now()}`;
                  const palette = ZONE_COLOR_PALETTE[zones.length % ZONE_COLOR_PALETTE.length];
                  setZones((prev) => [
                    ...prev,
                    {
                      clientId: id,
                      name: `Zona ${prev.length + 1}`,
                      color: palette.hex,
                      price: 100000,
                    },
                  ]);
                  setActiveZoneId(id);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-3.5 py-2 text-xs font-semibold text-ink hover:bg-page"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Tambah Kategori Zona</span>
              </button>
            </div>

            {/* Alat Terapkan Cepat */}
            <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-page p-3 text-xs">
              <span className="font-semibold text-ink">
                Terapkan Zona Aktif ({zones.find((z) => z.clientId === activeZoneId)?.name}) ke
                Baris/Ring:
              </span>
              <select
                value={rowFrom || distinctRows[0] || ""}
                onChange={(e) => setRowFrom(e.target.value)}
                className="rounded-lg border border-line bg-white px-2.5 py-1.5 font-mono text-xs"
              >
                {distinctRows.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <span>sampai</span>
              <select
                value={rowTo || rowFrom || distinctRows[0] || ""}
                onChange={(e) => setRowTo(e.target.value)}
                className="rounded-lg border border-line bg-white px-2.5 py-1.5 font-mono text-xs"
              >
                {distinctRows.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={applyZoneToRowRange}
                className="rounded-lg bg-gate px-3 py-1.5 font-semibold text-white hover:bg-gate-strong"
              >
                Terapkan ke Rentang Ini
              </button>
              <button
                type="button"
                onClick={applyZoneToAllUnassigned}
                className="rounded-lg border border-line bg-white px-3 py-1.5 font-semibold text-ink hover:bg-page"
              >
                Isi Semua Kursi Tanpa Zona
              </button>
            </div>

            <div className="mt-4">
              <SeatMap
                layout={layout}
                seats={seatMapItems}
                zones={seatMapZones}
                mode="edit"
                onToggleSeat={handleToggleSeatZone}
              />
            </div>

            <div className="mt-5 flex justify-between">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-line bg-white px-4 py-2 text-xs font-semibold text-ink"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Layout Kursi</span>
              </button>
              <button
                type="button"
                onClick={() => setStep(4)}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-gate px-5 py-2 text-xs font-semibold text-white hover:bg-gate-strong"
              >
                <span>Lanjut ke Review & Publish</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ===================================================================== */}
      {/* LANGKAH 4: REVIEW & PUBLISH                                           */}
      {/* ===================================================================== */}
      {step === 4 && (
        <section className="rounded-2xl border border-line bg-white p-5 shadow-xs sm:p-6">
          <h2 className="text-base font-bold text-ink">Tinjau Acara & Publikasikan</h2>
          <p className="text-xs text-muted">
            Pastikan seluruh kursi sudah memiliki zona harga sebelum mempublikasikan acara.
          </p>

          <dl className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-line bg-page p-4 text-xs sm:grid-cols-2">
            <div>
              <dt className="text-muted">Nama Acara</dt>
              <dd className="font-bold text-ink">{name || "-"}</dd>
            </div>
            <div>
              <dt className="text-muted">Lokasi Venue</dt>
              <dd className="font-semibold text-ink">{venueName || "-"}</dd>
            </div>
            <div>
              <dt className="text-muted">Bentuk & Kapasitas Layout</dt>
              <dd className="font-semibold text-ink">
                {layoutType === "circle" ? "Melingkar 360°" : "Grid Baris × Kolom"} •{" "}
                {activeSeats.length} Kursi Aktif
              </dd>
            </div>
            <div>
              <dt className="text-muted">Status Penetapan Zona</dt>
              <dd
                className={`font-bold ${
                  unassignedCount === 0 ? "text-emerald-700" : "text-amber-700"
                }`}
              >
                {unassignedCount === 0
                  ? "Lengkap (0 kursi tanpa zona)"
                  : `Belum Lengkap (${unassignedCount} kursi belum diberi zona)`}
              </dd>
            </div>
          </dl>

          <div className="mt-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
              Ringkasan Kuota per Zona
            </h3>
            <div className="mt-2 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {zones.map((z) => {
                const count = activeSeats.filter(
                  (s) => seatZoneByLabel[s.label] === z.clientId
                ).length;
                return (
                  <div
                    key={z.clientId}
                    className="flex items-center justify-between rounded-xl border border-line p-3 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3.5 w-3.5 rounded-xs"
                        style={{ backgroundColor: z.color }}
                      />
                      <div>
                        <div className="font-bold text-ink">{z.name}</div>
                        <div className="text-muted">{count} kursi</div>
                      </div>
                    </div>
                    <div className="font-bold text-ink">{formatRupiah(z.price)}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-line bg-white px-4 py-2 text-xs font-semibold text-ink"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Kembali ke Zona</span>
            </button>

            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                disabled={saving}
                onClick={() => handleSave("DRAFT")}
                className="min-h-12 rounded-xl border border-line bg-white px-5 py-2.5 text-xs font-semibold text-ink hover:bg-page disabled:opacity-50"
              >
                {saving ? "Menyimpan..." : "Simpan sebagai Draft"}
              </button>

              <button
                type="button"
                disabled={saving || unassignedCount > 0 || activeSeats.length === 0}
                onClick={() => handleSave("PUBLISHED")}
                className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-gate px-6 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-gate-strong disabled:cursor-not-allowed disabled:bg-line disabled:text-muted"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>{saving ? "Mempublikasikan..." : "Simpan & Publikasikan Acara"}</span>
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
