import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { createToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: "Unesite korisničko ime i lozinku" }, { status: 400 });
    }

    const admin = await prisma.admin.findUnique({
      where: { username },
      include: { barber: true },
    });

    if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) {
      return NextResponse.json({ error: "Pogrešni podaci za prijavu" }, { status: 401 });
    }

    const token = await createToken({
      adminId: admin.id,
      username: admin.username,
      role: admin.role as "admin" | "barber",
      barberId: admin.barberId || undefined,
    });

    const response = NextResponse.json({
      role: admin.role,
      barberId: admin.barberId,
      username: admin.username,
    });

    response.cookies.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch {
    return NextResponse.json({ error: "Greška pri prijavi" }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete("session");
  return response;
}
