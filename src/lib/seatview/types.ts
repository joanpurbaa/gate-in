/**
 * Tipe data dan parameter fisik untuk simulasi 3D Virtual Seat View GateIn.
 * Satuan metrik dalam meter (m) dan derajat (deg).
 */

export interface Auditorium3DConfig {
  /** Tinggi mata manusia ketika duduk di kursi (meter) - default 1.15m */
  eyeHeight: number;
  /** Ketinggian panggung dari lantai dasar (meter) - default 1.2m */
  stageHeight: number;
  /** Kenaikan lantai per baris (raked / tiered elevation) dalam meter - default 0.18m */
  rowStepHeight: number;
  /** Field of View kamera perspektif (derajat) - default 65deg */
  fov: number;
  /** Apakah lantai bertingkat (auditorium/teater) atau datar (ballroom) */
  isRakedFloor: boolean;
  /** Lebar kursi fisik dalam meter - default 0.52m */
  seatWidth: number;
  /** Jarak spasi antar kursi dalam meter - default 0.58m */
  seatSpacing: number;
}

export const DEFAULT_AUDITORIUM_CONFIG: Auditorium3DConfig = {
  eyeHeight: 1.15,
  stageHeight: 1.2,
  rowStepHeight: 0.18,
  fov: 65,
  isRakedFloor: true,
  seatWidth: 0.52,
  seatSpacing: 0.58,
};

export interface Seat3DPoint {
  label: string;
  rowLabel: string;
  number: number;
  zoneId: string | null;
  zoneName: string | null;
  zoneColor: string;
  price: number;
  /** Posisi X dunia (meter) */
  x: number;
  /** Ketinggian lantai Y dunia (meter) */
  y: number;
  /** Posisi Z kedalaman dunia (meter) */
  z: number;
  /** Arah hadap kursi dalam derajat */
  rotationDeg: number;
}

export interface Stage3DData {
  shape: "rect" | "ellipse";
  x: number;
  y: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  label: string;
}

export interface Obstacle3D {
  id: string;
  name: string;
  type: "pillar" | "barrier" | "truss";
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  depth: number;
}
