import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireBarberOrAdmin } from "@/lib/auth";
import { canManageOwnAvailability } from "@/lib/roles";
import { format } from "date-fns";
import { isValidDateRange } from "@/lib/booking-utils";
import { z } from "zod";

function authError(err: unknown) {
  if (err instanceof Error && err.message === "Unauthorized") {
    return NextResponse.json(
      { error: "Niste prijavljeni. Osvježite stranicu i prijavite se ponovo." },
      { status: 401 }
    );
  }
  console.error(err);
  return NextResponse.json({ error: "Greška na serveru" }, { status: 500 });
}

function requireBarber(session: Awaited<ReturnType<typeof requireBarberOrAdmin>>) {
  if (!canManageOwnAvailability(session)) {
    return NextResponse.json(
      { error: "Nemate povezan barberski profil." },
      { status: 403 }
    );
  }
  return null;
}

export async function GET() {
  try {
    const session = await requireBarberOrAdmin();
    const denied = requireBarber(session);
    if (denied) return denied;

    const barberId = session.barberId!;
    const today = format(new Date(), "yyyy-MM-dd");

    const [schedules, closedPeriods, blockedSlots, closedDays] = await Promise.all([
      prisma.barberSchedule.findMany({
        where: { barberId },
        orderBy: { dayOfWeek: "asc" },
      }),
      prisma.closedPeriod.findMany({
        where: { barberId, endDate: { gte: today } },
        orderBy: { startDate: "asc" },
      }),
      prisma.blockedSlot.findMany({
        where: { barberId, date: { gte: today } },
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
      }),
      prisma.closedDay.findMany({
        where: { barberId, date: { gte: today } },
        orderBy: { date: "asc" },
      }),
    ]);

    return NextResponse.json({
      schedules,
      closedPeriods,
      blockedSlots,
      closedDays,
    });
  } catch (err) {
    return authError(err);
  }
}

const scheduleItemSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  isWorking: z.boolean(),
});

export async function PUT(req: NextRequest) {
  try {
    const session = await requireBarberOrAdmin();
    const denied = requireBarber(session);
    if (denied) return denied;

    const body = await req.json();
    const schedules = z.array(scheduleItemSchema).parse(body.schedules);

    for (const s of schedules) {
      if (s.isWorking && s.startTime >= s.endTime) {
        return NextResponse.json(
          { error: "Početak mora biti prije kraja radnog vremena" },
          { status: 400 }
        );
      }
    }

    await Promise.all(
      schedules.map((s) =>
        prisma.barberSchedule.upsert({
          where: {
            barberId_dayOfWeek: {
              barberId: session.barberId!,
              dayOfWeek: s.dayOfWeek,
            },
          },
          create: {
            barberId: session.barberId!,
            dayOfWeek: s.dayOfWeek,
            startTime: s.startTime,
            endTime: s.endTime,
            isWorking: s.isWorking,
          },
          update: {
            startTime: s.startTime,
            endTime: s.endTime,
            isWorking: s.isWorking,
          },
        })
      )
    );

    const updated = await prisma.barberSchedule.findMany({
      where: { barberId: session.barberId },
      orderBy: { dayOfWeek: "asc" },
    });

    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message }, { status: 400 });
    }
    return authError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireBarberOrAdmin();
    const denied = requireBarber(session);
    if (denied) return denied;

    const body = await req.json();
    const { type } = body;

    if (type === "period") {
      const { startDate, endDate, reason } = body;
      if (!startDate || !endDate || !isValidDateRange(startDate, endDate)) {
        return NextResponse.json({ error: "Nevalidan period" }, { status: 400 });
      }

      const period = await prisma.closedPeriod.create({
        data: {
          barberId: session.barberId!,
          startDate,
          endDate,
          reason: reason || null,
        },
      });
      return NextResponse.json(period, { status: 201 });
    }

    if (type === "block") {
      const { date, startTime, endTime, allDay, reason } = body;
      if (!date) {
        return NextResponse.json({ error: "Datum je obavezan" }, { status: 400 });
      }

      if (!allDay && (!startTime || !endTime)) {
        return NextResponse.json({ error: "Unesite vrijeme blokade" }, { status: 400 });
      }

      if (!allDay && startTime >= endTime) {
        return NextResponse.json(
          { error: "Početak blokade mora biti prije kraja" },
          { status: 400 }
        );
      }

      const block = await prisma.blockedSlot.create({
        data: {
          barberId: session.barberId!,
          date,
          startTime: allDay ? null : startTime,
          endTime: allDay ? null : endTime,
          allDay: allDay ?? false,
          reason: reason || null,
        },
      });
      return NextResponse.json(block, { status: 201 });
    }

    return NextResponse.json({ error: "Nepoznat tip" }, { status: 400 });
  } catch (err) {
    return authError(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireBarberOrAdmin();
    const denied = requireBarber(session);
    if (denied) return denied;

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const id = searchParams.get("id");

    if (!id || !type) {
      return NextResponse.json({ error: "ID i tip su obavezni" }, { status: 400 });
    }

    if (type === "period") {
      const period = await prisma.closedPeriod.findFirst({
        where: { id, barberId: session.barberId },
      });
      if (!period) return NextResponse.json({ error: "Nije pronađeno" }, { status: 404 });
      await prisma.closedPeriod.delete({ where: { id } });
    } else if (type === "block") {
      const block = await prisma.blockedSlot.findFirst({
        where: { id, barberId: session.barberId },
      });
      if (!block) return NextResponse.json({ error: "Nije pronađeno" }, { status: 404 });
      await prisma.blockedSlot.delete({ where: { id } });
    } else {
      return NextResponse.json({ error: "Nepoznat tip" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return authError(err);
  }
}
