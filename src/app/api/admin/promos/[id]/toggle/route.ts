import { NextResponse, type NextRequest } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Sesi tidak sah" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.promotion.findUnique({
    where: { id },
    select: { id: true, organizerId: true, isActive: true },
  });

  if (!existing || existing.organizerId !== session.organizerId) {
    return NextResponse.json({ error: "Promo tidak ditemukan" }, { status: 404 });
  }

  const updated = await prisma.promotion.update({
    where: { id },
    data: { isActive: !existing.isActive },
    select: { id: true, isActive: true },
  });

  return NextResponse.json({ success: true, isActive: updated.isActive });
}
