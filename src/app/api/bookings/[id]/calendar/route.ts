import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateIcs } from "@/lib/calendar";
import { formatPrice } from "@/lib/booking-utils";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      barber: { select: { name: true } },
      service: { select: { name: true, price: true, durationMinutes: true } },
    },
  });

  if (!booking || booking.status === "cancelled") {
    return NextResponse.json({ error: "Rezervacija nije pronađena" }, { status: 404 });
  }

  const origin = req.nextUrl.origin;
  const confirmUrl = `${origin}/booking/${id}`;

  const ics = generateIcs({
    title: `Glory 4 Nix — ${booking.service.name}`,
    description: [
      `Barber: ${booking.barber.name}`,
      `Usluga: ${booking.service.name}`,
      `Cijena: ${formatPrice(booking.service.price)}`,
      `Klijent: ${booking.customerName}`,
      "",
      `Potvrda: ${confirmUrl}`,
    ].join("\n"),
    location: "Glory 4 Nix Barbershop",
    date: booking.date,
    startTime: booking.startTime,
    durationMinutes: booking.service.durationMinutes,
    bookingId: id,
  });

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="glory4nix-${booking.date}.ics"`,
    },
  });
}
