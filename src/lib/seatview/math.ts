import type { LayoutV1 } from "@/lib/layout/types";
import type { SeatMapItem, SeatZoneInfo } from "@/components/seatmap/types";
import type { Auditorium3DConfig, Seat3DPoint, Stage3DData, Obstacle3D } from "./types";

export interface SightlineMetrics {
  distanceToStage: number; // Jarak horizontal ke pusat panggung (meter)
  verticalAngleDeg: number; // Sudut vertikal elevasi pandangan (derajat, positif = mendongak)
  horizontalAngleDeg: number; // Sudut horizontal deviasi dari sumbu tengah panggung (derajat)
  seatHeightFromGround: number; // Ketinggian lantai kursi (meter)
  eyeElevation: number; // Ketinggian mata penonton total (meter)
  viewQuality: "optimal" | "good" | "steep_up" | "steep_down" | "side_angle";
  qualityDescription: string;
}

export interface Converted3DScene {
  stage: Stage3DData;
  seats3D: Seat3DPoint[];
  obstacles: Obstacle3D[];
  floorBounds: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  };
  stageCenter3D: { x: number; y: number; z: number };
  targetPoint3D: { x: number; y: number; z: number };
}

/**
 * Konversi koordinat kanvas 2D ke ruang fisik 3D (satuan meter).
 */
export function convertLayoutTo3D(
  layout: LayoutV1,
  seats: SeatMapItem[],
  zones: SeatZoneInfo[],
  config: Auditorium3DConfig
): Converted3DScene {
  const zoneMap = new Map<string, SeatZoneInfo>(zones.map((z) => [z.id, z]));

  // Skala: 1 unit kanvas kursi (seatSize px) setara dengan lebar fisik kursi + jarak spasi
  const seatSizePx = Math.max(layout.seatSize || 24, 12);
  const meterPerPx = config.seatSpacing / seatSizePx;

  // Tentukan pusat panggung sebagai origin (0, y, 0)
  const stageRaw = layout.stage;
  const stageCenterX = stageRaw ? stageRaw.x + stageRaw.w / 2 : layout.canvas.width / 2;
  const stageCenterY = stageRaw ? stageRaw.y + stageRaw.h / 2 : 80;

  const stage3D: Stage3DData = {
    shape: stageRaw?.shape === "ellipse" ? "ellipse" : "rect",
    x: 0,
    y: 0,
    z: 0,
    width: stageRaw ? Math.max(stageRaw.w * meterPerPx, 6) : 14,
    depth: stageRaw ? Math.max(stageRaw.h * meterPerPx, 3) : 6,
    height: Math.max(config.stageHeight, 0.2),
    label: stageRaw?.label || "PANGGUNG UTAMA",
  };

  // Titik fokus mata penonton (kira-kira di tengah panggung setinggi 1.6m dari lantai panggung)
  const targetPoint3D = {
    x: 0,
    y: stage3D.height + 1.2, // Tinggi dada/wajah penampil di atas panggung
    z: 0,
  };

  // Hitung posisi 3D tiap kursi
  let minX = -stage3D.width;
  let maxX = stage3D.width;
  let minZ = -stage3D.depth;
  let maxZ = 15;

  const seats3D: Seat3DPoint[] = seats.map((seat) => {
    const zone = seat.zoneId ? zoneMap.get(seat.zoneId) : undefined;

    // Koordinat horizontal relatif terhadap pusat panggung
    const x = (seat.x - stageCenterX) * meterPerPx;
    // Jarak kedalaman dari panggung
    const z = (seat.y - stageCenterY) * meterPerPx;

    // Ketinggian lantai berdasarkan baris / tier auditorium
    let y = 0;
    if (config.isRakedFloor) {
      // Ekstrak nomor baris dari label (A, B, C... atau 1, 2, 3...)
      let rowIdx = 0;
      const matchAlpha = seat.rowLabel.match(/^[A-Za-z]+$/);
      if (matchAlpha) {
        rowIdx = seat.rowLabel.toUpperCase().charCodeAt(0) - 65;
      } else {
        const parsed = parseInt(seat.rowLabel, 10);
        if (!isNaN(parsed)) rowIdx = Math.max(0, parsed - 1);
      }
      y = Math.max(0, rowIdx) * config.rowStepHeight;
    }

    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;

    return {
      label: seat.label,
      rowLabel: seat.rowLabel,
      number: seat.number,
      zoneId: seat.zoneId ?? null,
      zoneName: zone?.name || "Reguler",
      zoneColor: zone?.color || "#2b2be8",
      price: zone?.price || 0,
      x,
      y,
      z,
      rotationDeg: seat.rotation || 0,
    };
  });

  // Tambahkan padding batas lantai
  minX -= 2;
  maxX += 2;
  minZ -= 3;
  maxZ += 3;

  // Struktur panggung & obstacle (sound tower, pilar, truss)
  const obstacles: Obstacle3D[] = [];

  // Sound Tower (Speaker Array gantung di kiri & kanan panggung)
  const halfStageW = stage3D.width / 2;
  obstacles.push({
    id: "sound-l",
    name: "Line Array L",
    type: "truss",
    x: -halfStageW - 0.8,
    y: 0,
    z: 0.5,
    width: 0.8,
    height: stage3D.height + 4.5,
    depth: 0.8,
  });
  obstacles.push({
    id: "sound-r",
    name: "Line Array R",
    type: "truss",
    x: halfStageW + 0.8,
    y: 0,
    z: 0.5,
    width: 0.8,
    height: stage3D.height + 4.5,
    depth: 0.8,
  });

  return {
    stage: stage3D,
    seats3D,
    obstacles,
    floorBounds: { minX, maxX, minZ, maxZ },
    stageCenter3D: { x: 0, y: stage3D.height / 2, z: 0 },
    targetPoint3D,
  };
}

/**
 * Hitung metrik garis pandang (sightline) dari posisi mata penonton ke panggung.
 */
export function calculateSightline(
  seat: Seat3DPoint,
  target: { x: number; y: number; z: number },
  config: Auditorium3DConfig
): SightlineMetrics {
  const eyeX = seat.x;
  const eyeY = seat.y + config.eyeHeight;
  const eyeZ = seat.z;

  const dx = target.x - eyeX;
  const dy = target.y - eyeY;
  const dz = target.z - eyeZ;

  const horizontalDistance = Math.hypot(dx, dz);
  const totalDistance = Math.hypot(dx, dy, dz);

  // Sudut vertikal pandangan (derajat). Positif = penonton mendongak ke atas
  const verticalAngleDeg = Math.round((Math.atan2(dy, horizontalDistance) * 180) / Math.PI);

  // Sudut horizontal deviasi dari sumbu tengah panggung (0 = pas lurus di depan panggung)
  const horizontalAngleDeg = Math.round((Math.atan2(Math.abs(dx), Math.abs(dz)) * 180) / Math.PI);

  // Evaluasi kenyamanan penglihatan berdasarkan standar ergonomi teater/konser
  let viewQuality: SightlineMetrics["viewQuality"] = "optimal";
  let qualityDescription = "Sudut pandang optimal dan bebas hambatan.";

  if (verticalAngleDeg > 22) {
    viewQuality = "steep_up";
    qualityDescription = `Panggung tinggi relatif dekat (${verticalAngleDeg}° ke atas). Anda perlu sedikit mendongak.`;
  } else if (verticalAngleDeg < -15) {
    viewQuality = "steep_down";
    qualityDescription = `Sudut pandang dari atas (${Math.abs(verticalAngleDeg)}° ke bawah), melihat panggung dari elevasi tinggi.`;
  } else if (horizontalAngleDeg > 40) {
    viewQuality = "side_angle";
    qualityDescription = `Posisi menyamping (${horizontalAngleDeg}°). Pandangan diagonal ke panggung.`;
  } else {
    viewQuality = "optimal";
    qualityDescription = `Sudut pandang sangat nyaman (${Math.abs(verticalAngleDeg)}°), pandangan panggung terbuka lebar.`;
  }

  return {
    distanceToStage: Number(totalDistance.toFixed(1)),
    verticalAngleDeg,
    horizontalAngleDeg,
    seatHeightFromGround: Number(seat.y.toFixed(2)),
    eyeElevation: Number(eyeY.toFixed(2)),
    viewQuality,
    qualityDescription,
  };
}
