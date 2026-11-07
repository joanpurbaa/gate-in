import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth";

const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4 MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

const uploadMetaSchema = z.object({
  filename: z.string().min(1).max(200),
  contentType: z.enum(ALLOWED_MIME_TYPES, {
    message: "Format gambar harus JPG, PNG, atau WebP",
  }),
  size: z
    .number()
    .int()
    .positive()
    .max(MAX_FILE_SIZE, "Ukuran file poster maksimal 4 MB"),
});

export async function POST(request: Request) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Sesi penyelenggara tidak valid. Silakan masuk kembali." },
        { status: 401 }
      );
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "BLOB_READ_WRITE_TOKEN belum dikonfigurasi di server. Gunakan URL poster eksternal atau kosongkan untuk memakai poster gradien bawaan.",
        },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const fileEntry = formData.get("file");

    if (!(fileEntry instanceof File) || fileEntry.size === 0) {
      return NextResponse.json(
        { ok: false, error: "File gambar tidak ditemukan" },
        { status: 400 }
      );
    }

    const parsedMeta = uploadMetaSchema.safeParse({
      filename: fileEntry.name || "poster.jpg",
      contentType: fileEntry.type,
      size: fileEntry.size,
    });

    if (!parsedMeta.success) {
      return NextResponse.json(
        { ok: false, error: parsedMeta.error.issues[0]?.message ?? "File gambar tidak valid" },
        { status: 400 }
      );
    }

    const safeName = parsedMeta.data.filename
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const blob = await put(`posters/${Date.now()}-${safeName}`, fileEntry, {
      access: "public",
      contentType: parsedMeta.data.contentType,
    });

    return NextResponse.json({
      ok: true,
      url: blob.url,
    });
  } catch (err) {
    console.error("[POST /api/admin/upload] error:", err);
    const message = err instanceof Error ? err.message : String(err);
    let userFriendlyError = "Gagal mengunggah poster ke Vercel Blob";

    if (message.includes("This store does not exist")) {
      userFriendlyError =
        "Vercel Blob: Store tidak ditemukan (This store does not exist). Pastikan Blob Store sudah dibuat di dashboard Vercel dan token BLOB_READ_WRITE_TOKEN di .env disalin lengkap (bukan terpotong).";
    } else if (
      message.includes("Unauthorized") ||
      message.includes("Forbidden") ||
      message.includes("Invalid token")
    ) {
      userFriendlyError =
        "Vercel Blob: Token tidak valid atau tidak memiliki izin akses (Unauthorized). Periksa kembali nilai BLOB_READ_WRITE_TOKEN di file .env.";
    } else if (err instanceof Error && err.message) {
      userFriendlyError = `Gagal mengunggah poster ke Vercel Blob: ${err.message}`;
    }

    return NextResponse.json(
      { ok: false, error: userFriendlyError },
      { status: 500 }
    );
  }
}
