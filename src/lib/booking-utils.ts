import {
  addMinutes,
  format,
  parse,
  startOfDay,
  addDays,
  isAfter,
} from "date-fns";
import { bs } from "date-fns/locale";
import { prisma } from "./db";

const SLOT_INTERVAL = 15;

export type DateAvailabilityStatus =
  | "available"
  | "off"
  | "closed"
  | "full"
  | "blocked";

export interface DateAvailabilityInfo {
  status: DateAvailabilityStatus;
  slotCount: number;
  message: string | null;
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function formatDateBS(dateStr: string): string {
  const date = parse(dateStr, "yyyy-MM-dd", new Date());
  return format(date, "EEEE, d. MMMM", { locale: bs });
}

export function formatPrice(price: number): string {
  return `${price} €`;
}

function isDateInRange(date: string, start: string, end: string): boolean {
  return date >= start && date <= end;
}

async function getDateContext(barberId: string, date: string) {
  const dateObj = parse(date, "yyyy-MM-dd", new Date());
  const dayOfWeek = dateObj.getDay();

  const [schedule, bookings, blocked, closedDay, globalClosed, closedPeriods] =
    await Promise.all([
      prisma.barberSchedule.findUnique({
        where: { barberId_dayOfWeek: { barberId, dayOfWeek } },
      }),
      prisma.booking.findMany({
        where: { barberId, date, status: { not: "cancelled" } },
      }),
      prisma.blockedSlot.findMany({ where: { barberId, date } }),
      prisma.closedDay.findFirst({ where: { barberId, date } }),
      prisma.closedDay.findFirst({ where: { barberId: null, date } }),
      prisma.closedPeriod.findMany({
        where: {
          barberId,
          startDate: { lte: date },
          endDate: { gte: date },
        },
      }),
    ]);

  return { schedule, bookings, blocked, closedDay, globalClosed, closedPeriods };
}

export async function getDateAvailabilityInfo(
  barberId: string,
  date: string,
  serviceDuration: number
): Promise<DateAvailabilityInfo> {
  const { schedule, blocked, closedDay, globalClosed, closedPeriods } =
    await getDateContext(barberId, date);

  const period = closedPeriods[0];
  if (period) {
    return {
      status: "closed",
      slotCount: 0,
      message: period.reason || "Barber nije dostupan u ovom periodu",
    };
  }

  if (closedDay || globalClosed) {
    return {
      status: "closed",
      slotCount: 0,
      message: closedDay?.reason || globalClosed?.reason || "Neradni dan",
    };
  }

  const allDayBlock = blocked.find((b) => b.allDay);
  if (allDayBlock) {
    return {
      status: "blocked",
      slotCount: 0,
      message: allDayBlock.reason || "Dan blokiran",
    };
  }

  if (!schedule || !schedule.isWorking) {
    return {
      status: "off",
      slotCount: 0,
      message: "Neradni dan",
    };
  }

  const slots = await computeAvailableSlots(
    barberId,
    date,
    serviceDuration,
    await getDateContext(barberId, date)
  );

  if (slots.length === 0) {
    const partialBlock = blocked.find((b) => !b.allDay && b.startTime && b.endTime);
    if (partialBlock && schedule) {
      return {
        status: "blocked",
        slotCount: 0,
        message: `Blokirano ${partialBlock.startTime}–${partialBlock.endTime}`,
      };
    }
    return {
      status: "full",
      slotCount: 0,
      message: "Nema slobodnih termina",
    };
  }

  return { status: "available", slotCount: slots.length, message: null };
}

async function computeAvailableSlots(
  barberId: string,
  date: string,
  serviceDuration: number,
  ctx: Awaited<ReturnType<typeof getDateContext>>
) {
  const { schedule, bookings, blocked, closedDay, globalClosed, closedPeriods } =
    ctx;

  if (closedPeriods.length > 0 || closedDay || globalClosed) return [];
  if (!schedule || !schedule.isWorking) return [];

  const workStart = timeToMinutes(schedule.startTime);
  const workEnd = timeToMinutes(schedule.endTime);
  const slots: string[] = [];

  const now = new Date();
  const todayStr = format(now, "yyyy-MM-dd");
  const isToday = date === todayStr;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  for (let t = workStart; t + serviceDuration <= workEnd; t += SLOT_INTERVAL) {
    if (isToday && t <= currentMinutes + 30) continue;

    const hasBookingConflict = bookings.some((b) => {
      const bStart = timeToMinutes(b.startTime);
      const bEnd = timeToMinutes(b.endTime);
      return t < bEnd && t + serviceDuration > bStart;
    });
    if (hasBookingConflict) continue;

    const isBlocked = blocked.some((bl) => {
      if (bl.allDay) return true;
      if (!bl.startTime || !bl.endTime) return false;
      const blStart = timeToMinutes(bl.startTime);
      const blEnd = timeToMinutes(bl.endTime);
      return t < blEnd && t + serviceDuration > blStart;
    });
    if (isBlocked) continue;

    slots.push(minutesToTime(t));
  }

  return slots;
}

export async function getAvailableSlots(
  barberId: string,
  date: string,
  serviceDuration: number
): Promise<string[]> {
  const ctx = await getDateContext(barberId, date);
  if (ctx.closedPeriods.length > 0) return [];
  return computeAvailableSlots(barberId, date, serviceDuration, ctx);
}

export async function isSlotAvailable(
  barberId: string,
  date: string,
  startTime: string,
  serviceDuration: number,
  excludeBookingId?: string
): Promise<boolean> {
  const slots = await getAvailableSlots(barberId, date, serviceDuration);
  if (!slots.includes(startTime)) return false;

  if (excludeBookingId) {
    const existing = await prisma.booking.findFirst({
      where: {
        barberId,
        date,
        startTime,
        status: { not: "cancelled" },
        id: { not: excludeBookingId },
      },
    });
    return !existing;
  }

  return true;
}

export function getNextAvailableDates(count = 21): string[] {
  const dates: string[] = [];
  let current = startOfDay(new Date());
  for (let i = 0; i < count + 7 && dates.length < count; i++) {
    dates.push(format(addDays(current, i), "yyyy-MM-dd"));
  }
  return dates;
}

export function computeEndTime(startTime: string, durationMinutes: number): string {
  const start = parse(startTime, "HH:mm", new Date());
  return format(addMinutes(start, durationMinutes), "HH:mm");
}

export function eachDateInRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  let current = parse(startDate, "yyyy-MM-dd", new Date());
  const end = parse(endDate, "yyyy-MM-dd", new Date());
  while (!isAfter(current, end)) {
    dates.push(format(current, "yyyy-MM-dd"));
    current = addDays(current, 1);
  }
  return dates;
}

export function isValidDateRange(startDate: string, endDate: string): boolean {
  return startDate <= endDate;
}
