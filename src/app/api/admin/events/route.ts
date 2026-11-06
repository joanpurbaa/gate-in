import { NextResponse, type NextRequest } from "next/server";
import { getAdminSession } from "@/lib/auth";
import {
  eventPayloadSchema,
  slugifyEventName,
  validateEventBusinessRules,
} from "@/lib/admin-event";
import { prisma } from "@/lib/db";
import { buildLayout, layoutToSeats } from "@/lib/layout/generate";
import { revalidateEventsCache } from "@/lib/cache";

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

  let slug = input.slug || slugifyEventName(input.name);
  const existingSlug = await prisma.event.findUnique({ where: { slug }, select: { id: true } });
  if (existingSlug) {
    slug = slugifyEventName(input.name);
  }

  const layoutObj = input.generator
    ? buildLayout(input.generator, { stageLabel: input.stageLabel })
    : null;
  const generatedSeats = layoutObj ? layoutToSeats(layoutObj) : [];

  const created = await prisma.$transaction(async (tx) => {
    const ev = await tx.event.create({
      data: {
        organizerId: session.organizerId,
        slug,
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
        layout: layoutObj ? (layoutObj as unknown as object) : undefined,
        layoutLocked: false,
      },
    });

    const dbZoneByClientId = new Map<string, string>();
    for (let i = 0; i < input.zones.length; i++) {
      const z = input.zones[i];
      const createdZone = await tx.zone.create({
        data: {
          eventId: ev.id,
          name: z.name,
          color: z.color,
          price: z.price,
          sortOrder: i + 1,
        },
      });
      dbZoneByClientId.set(z.clientId, createdZone.id);
    }

    if (generatedSeats.length > 0) {
      await tx.seat.createMany({
        data: generatedSeats.map((s) => {
          const clientZoneId = input.seatZoneByLabel[s.label];
          const dbZoneId = clientZoneId ? dbZoneByClientId.get(clientZoneId) ?? null : null;
          return {
            eventId: ev.id,
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

    return ev;
  });

  await revalidateEventsCache();

  return NextResponse.json(
    {
      ok: true,
      event: {
        id: created.id,
        slug: created.slug,
        status: created.status,
      },
    },
    { status: 201 }
  );
}
