import { headers } from "next/headers";
import { auth } from "./auth-server";

/**
 * Mendapatkan sesi pengguna pembeli yang sedang aktif di sisi server (App Router).
 * Mengembalikan data session & user atau null jika belum login.
 */
export async function getCurrentUserSession() {
  try {
    const headerList = await headers();
    const session = await auth.api.getSession({
      headers: headerList,
    });
    return session;
  } catch (error) {
    console.error("Gagal membaca sesi pengguna:", error);
    return null;
  }
}
