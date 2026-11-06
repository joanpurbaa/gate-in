import { ImageResponse } from "next/og";
import { loadDisplayFont, readBrandSvgDataUri } from "@/lib/brand-image";
import { BRAND_COLORS } from "@/lib/design-tokens";

export const alt = "GateIn — Tiket acara dengan denah kursi asli di Summarecon Mall Bandung";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const TAGLINE = "Tiket acara dengan denah kursi asli di Summarecon Mall Bandung";

export default async function OpenGraphImage() {
  const [mark, font] = await Promise.all([
    readBrandSvgDataUri("gatein-mark-reversed.svg"),
    loadDisplayFont(`GateIn${TAGLINE}`),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 96px",
          background: BRAND_COLORS.ink,
          color: BRAND_COLORS.card,
          fontFamily: font ? "Bricolage Grotesque" : "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 36 }}>
          <img src={mark} width={168} height={168} alt="" />
          <div style={{ fontSize: 148, fontWeight: 800, letterSpacing: "-0.03em" }}>GateIn</div>
        </div>
        <div
          style={{
            marginTop: 44,
            fontSize: 40,
            fontWeight: 800,
            letterSpacing: "-0.01em",
            color: BRAND_COLORS.line,
            maxWidth: 940,
            lineHeight: 1.2,
          }}
        >
          {TAGLINE}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: font
        ? [{ name: "Bricolage Grotesque", data: font, style: "normal", weight: 800 }]
        : undefined,
    }
  );
}
