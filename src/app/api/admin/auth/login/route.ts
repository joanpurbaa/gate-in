import bcrypt from "bcryptjs";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { ADMIN_COOKIE_NAME, signAdminToken } from "@/lib/auth";
import { prisma } from "@/lib/db";

const loginSchema = z.object({
  email: z.string().trim().email("Format email tidak valid"),
  password: z.string().min(1, "Kata sandi wajib diisi"),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Format JSON tidak valid" }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Input tidak valid" },
      { status: 400 }
    );
  }

  const email = parsed.data.email.toLowerCase();
  const organizer = await prisma.organizer.findUnique({
    where: { email },
  });

  if (!organizer) {
    return NextResponse.json({ error: "Email atau kata sandi salah" }, { status: 401 });
  }

  const valid = await bcrypt.compare(parsed.data.password, organizer.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Email atau kata sandi salah" }, { status: 401 });
  }

  const token = await signAdminToken({
    organizerId: organizer.id,
    email: organizer.email,
    name: organizer.name,
  });

  const res = NextResponse.json({
    ok: true,
    organizer: {
      id: organizer.id,
      email: organizer.email,
      name: organizer.name,
    },
  });

  res.cookies.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });

  return res;
}
