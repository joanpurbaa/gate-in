import { ImageResponse } from "next/og";
import { readBrandSvgDataUri } from "@/lib/brand-image";
import { BRAND_COLORS } from "@/lib/design-tokens";

// Ikon layar utama HP (apple-touch-icon) 180x180 dari public/brand/favicon.svg
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
  const favicon = await readBrandSvgDataUri("favicon.svg");
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: BRAND_COLORS.card,
        }}
      >
        <img src={favicon} width={140} height={140} alt="" />
      </div>
    ),
    { ...size }
  );
}
