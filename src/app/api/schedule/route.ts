import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireBarberOrAdmin } from "@/lib/auth";
import { sortBarbers } from "@/lib/barber-utils";
import { format } from "date-fns";

export async function GET(req: NextRequest) {
  try {
    const session = await requireBarberOrAdmin();
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date") || format(new Date(), "yyyy-MM-dd");

    const barberId = searchParams.get("barberId") ?? session.barberId;

    const where: Record<string, unknown> = {
      date,
      status: { not: "cancelled" },
    };
    if (barberId) where.barberId = barberId;

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        barber: { select: { id: true, name: true, accentColor: true } },
        service: { select: { name: true, price: true, durationMinutes: true } },
      },
      orderBy: { startTime: "asc" },
    });

    const barbers = sortBarbers(
      await prisma.barber.findMany({
        select: { id: true, name: true, slug: true, accentColor: true },
      })
    );

    const blocked = barberId
      ? await prisma.blockedSlot.findMany({ where: { barberId, date } })
      : [];

    return NextResponse.json({ bookings, barbers, blocked, date });
  } catch {
    return NextResponse.json({ error: "Neautorizovano" }, { status: 401 });
  }
}
