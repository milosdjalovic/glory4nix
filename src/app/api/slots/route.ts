import { NextRequest, NextResponse } from "next/server";
import {
  getAvailableSlots,
  getNextAvailableDates,
  getDateAvailabilityInfo,
} from "@/lib/booking-utils";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const barberId = searchParams.get("barberId");
  const serviceId = searchParams.get("serviceId");
  const date = searchParams.get("date");

  if (!barberId || !serviceId) {
    return NextResponse.json({ error: "barberId i serviceId su obavezni" }, { status: 400 });
  }

  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service) {
    return NextResponse.json({ error: "Usluga nije pronađena" }, { status: 404 });
  }

  if (date) {
    const [slots, info] = await Promise.all([
      getAvailableSlots(barberId, date, service.durationMinutes),
      getDateAvailabilityInfo(barberId, date, service.durationMinutes),
    ]);
    return NextResponse.json({ slots, date, ...info });
  }

  const dates = getNextAvailableDates(21);
  const availability: Record<string, number> = {};
  const dateInfo: Record<string, { status: string; message: string | null }> = {};

  await Promise.all(
    dates.map(async (d) => {
      const info = await getDateAvailabilityInfo(barberId, d, service.durationMinutes);
      availability[d] = info.slotCount;
      dateInfo[d] = { status: info.status, message: info.message };
    })
  );

  return NextResponse.json({ dates, availability, dateInfo });
}
