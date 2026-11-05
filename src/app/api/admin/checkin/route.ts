import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getAdminSession, getOwnedEventOrNull } from "@/lib/auth";
import { verifyAndCheckInTicket } from "@/lib/checkin";

const checkinSchema = z.object({
  eventId: z.string().min(1, "ID event wajib diisi"),
  code: z.string().trim().min(1, "Kode tiket wajib diisi").max(40),
});

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Sesi tidak valid" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Format JSON tidak valid" }, { status: 400 });
  }

  const parsed = checkinSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Input tidak valid" },
      { status: 400 }
    );
  }

  const owned = await getOwnedEventOrNull(parsed.data.eventId, session.organizerId);
  if (!owned) {
    return NextResponse.json(
      { error: "Acara tidak ditemukan atau bukan milik akun Anda" },
      { status: 404 }
    );
  }

  const outcome = await verifyAndCheckInTicket({
    eventId: owned.id,
    code: parsed.data.code,
    organizerId: session.organizerId,
  });

  return NextResponse.json(outcome);
}
