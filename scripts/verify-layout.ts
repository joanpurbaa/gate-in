import { buildLayout, layoutToSeats } from "../src/lib/layout/generate.ts";
import { SEAT_SIZE } from "../src/lib/layout/types.ts";
import { validateGenerator } from "../src/lib/layout/validate.ts";

function checkNoOverlap(seats: { label: string; x: number; y: number }[], minDistance: number) {
  for (let i = 0; i < seats.length; i++) {
    for (let j = i + 1; j < seats.length; j++) {
      const dist = Math.hypot(seats[i].x - seats[j].x, seats[i].y - seats[j].y);
      if (dist < minDistance) {
        throw new Error(
          `Kursi bertumpuk: ${seats[i].label} dan ${seats[j].label} berjarak ${dist.toFixed(2)} (< ${minDistance})`
        );
      }
    }
  }
}

function main() {
  // 1. Grid 15x20 = 300 kursi
  const gridGen = {
    type: "grid" as const,
    params: {
      rows: 15,
      cols: 20,
      rowLabelStyle: "alpha" as const,
      aisleAfterCols: [10],
      aisleAfterRows: [],
      stagePosition: "top" as const,
    },
    removedLabels: [],
  };
  const vGrid = validateGenerator(gridGen);
  if (!vGrid.ok) throw new Error(vGrid.error);
  const gridLayout = buildLayout(gridGen);
  const gridSeats = layoutToSeats(gridLayout);
  const gridSeatsAgain = layoutToSeats(buildLayout(gridGen));

  if (gridSeats.length !== 300) {
    throw new Error(`Grid 15x20 seharusnya 300 kursi, dapat ${gridSeats.length}`);
  }
  if (new Set(gridSeats.map((s) => s.label)).size !== 300) {
    throw new Error("Label kursi grid tidak unik");
  }
  if (JSON.stringify(gridSeats) !== JSON.stringify(gridSeatsAgain)) {
    throw new Error("Generator grid tidak deterministik");
  }
  checkNoOverlap(gridSeats, SEAT_SIZE);
  console.log("✔ Grid 15x20: tepat 300 kursi, label unik, deterministik, tidak ada kursi menumpuk.");

  // 2. Circle 24+32+40 = 96 kursi, 2 lorong
  const circleGen = {
    type: "circle" as const,
    params: {
      rings: 3,
      seatsPerRing: [24, 32, 40],
      aisleGaps: 2,
      gapSizeSeats: 2,
      startAngleDeg: -90,
    },
    removedLabels: [],
  };
  const vCircle = validateGenerator(circleGen);
  if (!vCircle.ok) throw new Error(vCircle.error);
  const circleLayout = buildLayout(circleGen);
  const circleSeats = layoutToSeats(circleLayout);

  if (circleSeats.length !== 96) {
    throw new Error(`Circle 24+32+40 seharusnya 96 kursi, dapat ${circleSeats.length}`);
  }
  if (new Set(circleSeats.map((s) => s.label)).size !== 96) {
    throw new Error("Label kursi circle tidak unik");
  }
  checkNoOverlap(circleSeats, SEAT_SIZE * 0.9);
  console.log("✔ Circle 24+32+40: tepat 96 kursi, label unik, deterministik, tidak ada kursi menumpuk.");

  // 3. Validasi batas 1.500 kursi
  const tooMany = validateGenerator({
    ...gridGen,
    params: { ...gridGen.params, rows: 40, cols: 40 },
  });
  if (tooMany.ok) {
    throw new Error("Validasi seharusnya menolak > 1.500 kursi");
  }
  console.log("✔ Validasi batas 1.500 kursi menolak 1.600 kursi:", tooMany.error);
}

main();
