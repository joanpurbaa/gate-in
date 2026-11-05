import { notFound } from "next/navigation";
import { SeatMapPlayground } from "./SeatMapPlayground";

export default function DevSeatMapPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }
  return <SeatMapPlayground />;
}
