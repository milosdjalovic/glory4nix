import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { notifyBarber } from "@/lib/notifications";
import { requireBarberOrAdmin, type SessionPayload } from "@/lib/auth";

function canManageBooking(session: SessionPayload, barberId: string): boolean {
  if (session.role === "admin") return true;
  if (session.role === "barber" && session.barberId === barberId) return true;
  return false;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireBarberOrAdmin();
    const { id } = await params;
    const body = await req.json();
    const { action, date, startTime, status } = body;

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { service: true, barber: true },
    });

    if (!booking) {
      return NextResponse.json({ error: "Rezervacija nije pronađena" }, { status: 404 });
    }

    if (!canManageBooking(session, booking.barberId)) {
      return NextResponse.json({ error: "Nemate dozvolu za ovu akciju" }, { status: 403 });
    }

    if (booking.status === "cancelled") {
      return NextResponse.json({ error: "Rezervacija je već otkazana" }, { status: 400 });
    }

    if (action === "cancel" || status === "cancelled") {
      const updated = await prisma.booking.update({
        where: { id },
        data: { status: "cancelled" },
        include: { barber: true, service: true },
      });

      // Obavijesti berbera samo ako otkazuje admin (berber već zna)
      if (session.role === "admin") {
        await notifyBarber(
          booking.barberId,
          "Otkazana rezervacija",
          `${booking.customerName} — ${booking.date} u ${booking.startTime} (${booking.service.name})`
        );
      }

      return NextResponse.json(updated);
    }

    if (action === "reschedule" && date && startTime) {
      if (session.role !== "admin") {
        return NextResponse.json({ error: "Samo admin može pomjeriti termin" }, { status: 403 });
      }

      const { isSlotAvailable, computeEndTime } = await import("@/lib/booking-utils");
      const available = await isSlotAvailable(
        booking.barberId,
        date,
        startTime,
        booking.service.durationMinutes,
        id
      );

      if (!available) {
        return NextResponse.json({ error: "Novi termin nije dostupan" }, { status: 409 });
      }

      const endTime = computeEndTime(startTime, booking.service.durationMinutes);
      const updated = await prisma.booking.update({
        where: { id },
        data: { date, startTime, endTime },
        include: { barber: true, service: true },
      });

      await notifyBarber(
        booking.barberId,
        "Promjena termina",
        `${booking.customerName} — novi termin: ${date} u ${startTime}`
      );

      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: "Nepoznata akcija" }, { status: 400 });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Neautorizovano" }, { status: 401 });
    }
    console.error(err);
    return NextResponse.json({ error: "Greška pri obradi zahtjeva" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireBarberOrAdmin();
    const { id } = await params;

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { service: true },
    });

    if (!booking) {
      return NextResponse.json({ error: "Rezervacija nije pronađena" }, { status: 404 });
    }

    if (!canManageBooking(session, booking.barberId)) {
      return NextResponse.json({ error: "Nemate dozvolu za ovu akciju" }, { status: 403 });
    }

    if (booking.status === "cancelled") {
      return NextResponse.json({ success: true });
    }

    await prisma.booking.update({
      where: { id },
      data: { status: "cancelled" },
    });

    if (session.role === "admin") {
      await notifyBarber(
        booking.barberId,
        "Otkazana rezervacija",
        `${booking.customerName} — ${booking.date} u ${booking.startTime}`
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Neautorizovano" }, { status: 401 });
    }
    return NextResponse.json({ error: "Greška" }, { status: 500 });
  }
}
