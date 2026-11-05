import { createHash } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./db.ts";

export const ADMIN_COOKIE_NAME = "gatein_admin_session";

export interface AdminSessionPayload {
  organizerId: string;
  email: string;
  name: string;
}

function getSecretKey(): Uint8Array {
  const raw =
    process.env.AUTH_SECRET ||
    createHash("sha256")
      .update(process.env.DATABASE_URL || "gatein-fallback-dev-secret-2026")
      .digest("hex");
  return new TextEncoder().encode(raw);
}

export async function signAdminToken(payload: AdminSessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecretKey());
}

export async function verifyAdminToken(token: string): Promise<AdminSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (
      typeof payload.organizerId === "string" &&
      typeof payload.email === "string" &&
      typeof payload.name === "string"
    ) {
      return {
        organizerId: payload.organizerId,
        email: payload.email,
        name: payload.name,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function getAdminSession(): Promise<AdminSessionPayload | null> {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyAdminToken(token);
}

export async function requireAdminPageSession(): Promise<AdminSessionPayload> {
  const session = await getAdminSession();
  if (!session) {
    redirect("/admin/login");
  }
  return session;
}

/**
 * Cek kepemilikan event oleh penyelenggara yang sedang login (Aturan Keras #3).
 */
export async function getOwnedEventOrNull(eventId: string, organizerId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
  });
  if (!event || event.organizerId !== organizerId) {
    return null;
  }
  return event;
}
