import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { registerWaitingList, WaitingListError } from "@/lib/waiting-list/service";
import { matchWaitingListForEvent } from "@/lib/waiting-list/matcher";

const registerSchema = z.object({
  eventId: z.string().min(1, "ID acara wajib diisi"),
  zoneId: z.string().min(1, "Zona tiket wajib dipilih"),
  buyerName: z
    .string()
    .trim()
    .min(2, "Nama minimal 2 karakter")
    .max(100, "Nama terlalu panjang"),
  buyerPhone: z.string().trim().min(8, "Nomor WhatsApp wajib diisi").max(25),
  quantity: z
    .number()
    .int("Jumlah tiket harus bilangan bulat")
    .min(1, "Minimal 1 tiket")
    .max(10, "Maksimal 10 tiket"),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Format data JSON tidak valid" }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data pendaftaran tidak valid" },
      { status: 400 }
    );
  }

  try {
    const result = await registerWaitingList(parsed.data);

    // Evaluasi kesempatan pencocokan instan bila kursi kebetulan tersedia
    matchWaitingListForEvent(
      parsed.data.eventId,
      parsed.data.zoneId,
      req.nextUrl.origin
    ).catch(console.error);

    return NextResponse.json(
      {
        ok: true,
        entry: result.entry,
        queuePosition: result.queuePosition,
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof WaitingListError) {
      const statusCode =
        err.code === "DUPLICATE_ENTRY"
          ? 409
          : err.code === "EVENT_NOT_FOUND" || err.code === "ZONE_NOT_FOUND"
            ? 404
            : 400;

      return NextResponse.json(
        {
          error: err.message,
          code: err.code,
        },
        { status: statusCode }
      );
    }

    const message =
      err instanceof Error ? err.message : "Gagal mendaftar ke waiting list";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
