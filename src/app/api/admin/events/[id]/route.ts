import { NextResponse, type NextRequest } from "next/server";
import { getAdminSession, getOwnedEventOrNull } from "@/lib/auth";
import { eventPayloadSchema, validateEventBusinessRules } from "@/lib/admin-event";
import { prisma } from "@/lib/db";
import { buildLayout, layoutToSeats } from "@/lib/layout/generate";
import { revalidateEventsCache } from "@/lib/cache";

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Sesi tidak valid" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const existing = await getOwnedEventOrNull(id, session.organizerId);
  if (!existing) {
    return NextResponse.json(
      { error: "Acara tidak ditemukan atau bukan milik akun Anda" },
      { status: 404 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Format JSON tidak valid" }, { status: 400 });
  }

  const parsed = eventPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data acara tidak valid" },
      { status: 400 }
    );
  }

  const input = parsed.data;
  const ruleError = validateEventBusinessRules(input);
  if (ruleError) {
    return NextResponse.json({ error: ruleError }, { status: 400 });
  }

  // Cek apakah sudah ada kursi HELD/SOLD di database
  const nonAvailableCount = await prisma.seat.count({
    where: {
      eventId: existing.id,
      status: { not: "AVAILABLE" },
    },
  });
  const isLocked = existing.layoutLocked || nonAvailableCount > 0;

  await prisma.$transaction(async (tx) => {
    const layoutObj =
      !isLocked && input.generator
        ? buildLayout(input.generator, { stageLabel: input.stageLabel })
        : undefined;

    await tx.event.update({
      where: { id: existing.id },
      data: {
        name: input.name,
        category: input.category,
        organizerName: input.organizerName ?? null,
        description: input.description,
        posterUrl: input.posterUrl ?? null,
        venueName: input.venueName,
        venueAddress: input.venueAddress ?? null,
        startsAt: new Date(input.startsAt),
        gateOpenAt: new Date(input.gateOpenAt),
        gateCloseAt: new Date(input.gateCloseAt),
        salesOpenAt: new Date(input.salesOpenAt),
        salesCloseAt: new Date(input.salesCloseAt),
        maxSeatsPerOrder: input.maxSeatsPerOrder,
        contactInfo: input.contactInfo ?? null,
        policyNote: input.policyNote ?? null,
        status: input.status,
        ...(layoutObj ? { layout: layoutObj as unknown as object } : {}),
        layoutLocked: isLocked,
      },
    });

    // Kelola zona: pertahankan zona yang clientId-nya cocok dengan id DB atau buat baru
    const existingZones = await tx.zone.findMany({ where: { eventId: existing.id } });
    const existingZoneIds = new Set(existingZones.map((z) => z.id));
    const dbZoneByClientId = new Map<string, string>();

    for (let i = 0; i < input.zones.length; i++) {
      const z = input.zones[i];
      if (existingZoneIds.has(z.clientId)) {
        await tx.zone.update({
          where: { id: z.clientId },
          data: {
            name: z.name,
            color: z.color,
            price: z.price,
            sortOrder: i + 1,
          },
        });
        dbZoneByClientId.set(z.clientId, z.clientId);
      } else {
        const createdZone = await tx.zone.create({
          data: {
            eventId: existing.id,
            name: z.name,
            color: z.color,
            price: z.price,
            sortOrder: i + 1,
          },
        });
        dbZoneByClientId.set(z.clientId, createdZone.id);
      }
    }

    const keptDbZoneIds = new Set(dbZoneByClientId.values());
    const removedZoneIds = existingZones
      .filter((z) => !keptDbZoneIds.has(z.id))
      .map((z) => z.id);

    if (!isLocked && layoutObj) {
      // Layout belum terkunci: boleh bangun ulang daftar kursi
      await tx.seat.deleteMany({ where: { eventId: existing.id } });
      if (removedZoneIds.length > 0) {
        await tx.zone.deleteMany({ where: { id: { in: removedZoneIds } } });
      }
      const generatedSeats = layoutToSeats(layoutObj);
      if (generatedSeats.length > 0) {
        await tx.seat.createMany({
          data: generatedSeats.map((s) => {
            const clientZoneId = input.seatZoneByLabel[s.label];
            const dbZoneId = clientZoneId ? dbZoneByClientId.get(clientZoneId) ?? null : null;
            return {
              eventId: existing.id,
              zoneId: dbZoneId,
              label: s.label,
              rowLabel: s.rowLabel,
              number: s.number,
              x: s.x,
              y: s.y,
              rotation: s.rotation,
            };
          }),
        });
      }
    } else {
      // Layout sudah terkunci: hanya perbarui zoneId untuk kursi yang masih AVAILABLE (tidak menyentuh status kursi!)
      for (const [clientId, dbZoneId] of dbZoneByClientId.entries()) {
        const labelsForZone = Object.entries(input.seatZoneByLabel)
          .filter(([, zId]) => zId === clientId)
          .map(([lbl]) => lbl);
        if (labelsForZone.length > 0) {
          await tx.seat.updateMany({
            where: {
              eventId: existing.id,
              label: { in: labelsForZone },
              status: "AVAILABLE",
            },
            data: { zoneId: dbZoneId },
          });
        }
      }
    }
  });

  await revalidateEventsCache(existing.slug);

  return NextResponse.json({
    ok: true,
    event: {
      id: existing.id,
      slug: existing.slug,
      status: input.status,
      layoutLocked: isLocked,
    },
  });
}
