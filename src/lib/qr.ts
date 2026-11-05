import { randomBytes } from "node:crypto";
import QRCode from "qrcode";

// 31 karakter: huruf besar + angka tanpa 0, O, 1, I, L (lihat docs/DATA_MODEL.md bagian 4)
const TICKET_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/**
 * Buat kode tiket 10 karakter acak kriptografis tanpa karakter membingungkan.
 * Contoh: `K7M2QX9PTA`.
 */
export function generateTicketCode(length = 10): string {
  const bytes = randomBytes(length * 2);
  let out = "";
  for (let i = 0; i < bytes.length && out.length < length; i++) {
    const b = bytes[i];
    // Hindari modulo bias sederhana (248 = 31 * 8)
    if (b < 248) {
      out += TICKET_ALPHABET[b % TICKET_ALPHABET.length];
    }
  }
  while (out.length < length) {
    const b = randomBytes(1)[0];
    out += TICKET_ALPHABET[b % TICKET_ALPHABET.length];
  }
  return out;
}

/** Buat ID pesanan acak panjang yang tidak bisa ditebak. */
export function generateOrderId(): string {
  return `ord_${randomBytes(14).toString("base64url").toLowerCase()}`;
}

/** Buat token hold acak kriptografis. */
export function generateHoldToken(): string {
  return `hld_${randomBytes(16).toString("base64url")}`;
}

/**
 * Render QR code (isinya HANYA kode tiket sesuai spesifikasi) menjadi Data URL PNG.
 */
export async function ticketCodeToQrDataUrl(code: string): Promise<string> {
  return QRCode.toDataURL(code, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 360,
    color: {
      dark: "#171717",
      light: "#FFFFFF",
    },
  });
}
