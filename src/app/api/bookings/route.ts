import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  isSlotAvailable,
  computeEndTime,
} from "@/lib/booking-utils";
import { notifyBarber } from "@/lib/notifications";

const bookingSchema = z.object({
  barberId: z.string(),
  serviceId: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  customerName: z.string().min(2, "Ime mora imati najmanje 2 karaktera"),
  customerPhone: z.string().min(6, "Unesite validan broj telefona"),
  customerEmail: z.string().email().optional().or(z.literal("")),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = bookingSchema.parse(body);

    const service = await prisma.service.findUnique({
      where: { id: data.serviceId },
    });
    if (!service || !service.active) {
      return NextResponse.json({ error: "Usluga nije dostupna" }, { status: 400 });
    }

    const available = await isSlotAvailable(
      data.barberId,
      data.date,
      data.startTime,
      service.durationMinutes
    );

    if (!available) {
      return NextResponse.json(
        { error: "Termin više nije dostupan. Molimo odaberite drugi." },
        { status: 409 }
      );
    }

    const endTime = computeEndTime(data.startTime, service.durationMinutes);

    const booking = await prisma.$transaction(async (tx) => {
      const conflict = await tx.booking.findFirst({
        where: {
          barberId: data.barberId,
          date: data.date,
          startTime: data.startTime,
          status: { not: "cancelled" },
        },
      });

      if (conflict) {
        throw new Error("CONFLICT");
      }

      const cancelledSlot = await tx.booking.findFirst({
        where: {
          barberId: data.barberId,
          date: data.date,
          startTime: data.startTime,
          status: "cancelled",
        },
      });

      if (cancelledSlot) {
        return tx.booking.update({
          where: { id: cancelledSlot.id },
          data: {
            serviceId: data.serviceId,
            endTime,
            customerName: data.customerName,
            customerPhone: data.customerPhone,
            customerEmail: data.customerEmail || null,
            notes: data.notes || null,
            status: "confirmed",
          },
          include: {
            barber: { select: { name: true } },
            service: { select: { name: true, price: true } },
          },
        });
      }

      return tx.booking.create({
        data: {
          barberId: data.barberId,
          serviceId: data.serviceId,
          date: data.date,
          startTime: data.startTime,
          endTime,
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          customerEmail: data.customerEmail || null,
          notes: data.notes || null,
        },
        include: {
          barber: { select: { name: true } },
          service: { select: { name: true, price: true } },
        },
      });
    });

    await notifyBarber(
      data.barberId,
      "Nova rezervacija",
      `${data.customerName} — ${data.date} u ${data.startTime} (${service.name})`
    );

    return NextResponse.json(booking, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.issues[0]?.message || "Nevalidni podaci" },
        { status: 400 }
      );
    }
    if (err instanceof Error && err.message === "CONFLICT") {
      return NextResponse.json(
        { error: "Termin je upravo zauzet. Odaberite drugi." },
        { status: 409 }
      );
    }
    console.error(err);
    return NextResponse.json({ error: "Greška pri rezervaciji" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "ID je obavezan" }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      barber: { select: { name: true } },
      service: { select: { name: true, price: true, durationMinutes: true } },
    },
  });

  if (!booking) {
    return NextResponse.json({ error: "Rezervacija nije pronađena" }, { status: 404 });
  }

  return NextResponse.json(booking);
}
