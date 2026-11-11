import dynamic from "next/dynamic";

export const VirtualSeatViewModal = dynamic(
  () => import("./VirtualSeatViewModal").then((mod) => mod.VirtualSeatViewModal),
  {
    ssr: false,
  }
);
