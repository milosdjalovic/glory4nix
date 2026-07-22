import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { z } from "zod";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAdmin();
    void session;

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const barberId = searchParams.get("barberId");
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {};
    if (date) where.date = date;
    if (barberId) where.barberId = barberId;
    if (status) where.status = status;
    else where.status = { not: "cancelled" };

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        barber: { select: { id: true, name: true, accentColor: true } },
        service: { select: { name: true, price: true, durationMinutes: true } },
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    });

    return NextResponse.json(bookings);
  } catch {
    return NextResponse.json({ error: "Neautorizovano" }, { status: 401 });
  }
}

const serviceSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().int().positive(),
  durationMinutes: z.number().int().positive(),
  active: z.boolean().optional(),
  sortOrder: z.number().optional(),
});

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const { type } = body;

    if (type === "service") {
      const data = serviceSchema.parse(body);
      const service = await prisma.service.create({ data });
      return NextResponse.json(service, { status: 201 });
    }

    if (type === "block") {
      const { barberId, date, startTime, endTime, reason, allDay } = body;
      const block = await prisma.blockedSlot.create({
        data: { barberId, date, startTime, endTime, reason, allDay: allDay ?? false },
      });
      return NextResponse.json(block, { status: 201 });
    }

    if (type === "closedDay") {
      const { barberId, date, reason } = body;
      const closed = await prisma.closedDay.create({
        data: { barberId: barberId || null, date, reason },
      });
      return NextResponse.json(closed, { status: 201 });
    }

    return NextResponse.json({ error: "Nepoznat tip" }, { status: 400 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Neautorizovano" }, { status: 401 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const { type, id, ...data } = body;

    if (type === "service") {
      const service = await prisma.service.update({ where: { id }, data });
      return NextResponse.json(service);
    }

    return NextResponse.json({ error: "Nepoznat tip" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Greška" }, { status: 401 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "ID obavezan" }, { status: 400 });

    if (type === "block") {
      await prisma.blockedSlot.delete({ where: { id } });
    } else if (type === "closedDay") {
      await prisma.closedDay.delete({ where: { id } });
    } else if (type === "service") {
      await prisma.service.update({ where: { id }, data: { active: false } });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Greška" }, { status: 401 });
  }
}
