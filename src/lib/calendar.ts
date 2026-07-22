import { addMinutes, format, parse } from "date-fns";
import { formatPrice } from "@/lib/booking-utils";

export interface CalendarEvent {
  title: string;
  description: string;
  location?: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  bookingId: string;
}

function formatIcsDate(date: string, time: string): string {
  const d = parse(`${date} ${time}`, "yyyy-MM-dd HH:mm", new Date());
  return format(d, "yyyyMMdd'T'HHmmss");
}

function escapeIcs(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

export function generateIcs(event: CalendarEvent): string {
  const start = parse(`${event.date} ${event.startTime}`, "yyyy-MM-dd HH:mm", new Date());
  const end = addMinutes(start, event.durationMinutes);
  const dtStart = formatIcsDate(event.date, event.startTime);
  const now = format(new Date(), "yyyyMMdd'T'HHmmss");
  const uid = `booking-${event.bookingId}@glory4nix.com`;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Glory 4 Nix//Booking//BS",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${dtStart}`,
    `DTEND:${format(end, "yyyyMMdd'T'HHmmss")}`,
    `SUMMARY:${escapeIcs(event.title)}`,
    `DESCRIPTION:${escapeIcs(event.description)}`,
    event.location ? `LOCATION:${escapeIcs(event.location)}` : "",
    "STATUS:CONFIRMED",
    "BEGIN:VALARM",
    "TRIGGER:-PT1H",
    "ACTION:DISPLAY",
    "DESCRIPTION:Podsjetnik: termin za 1 sat",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);

  return lines.join("\r\n");
}

export function downloadIcs(event: CalendarEvent, filename?: string) {
  const ics = generateIcs(event);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename || `glory4nix-termin-${event.date}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function buildGoogleCalendarUrl(event: CalendarEvent): string {
  const start = parse(`${event.date} ${event.startTime}`, "yyyy-MM-dd HH:mm", new Date());
  const end = addMinutes(start, event.durationMinutes);

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${format(start, "yyyyMMdd'T'HHmmss")}/${format(end, "yyyyMMdd'T'HHmmss")}`,
    details: event.description,
    location: event.location || "",
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function buildShareText(event: CalendarEvent & {
  barberName: string;
  serviceName: string;
  price: number;
}): string {
  return [
    "✂️ Glory 4 Nix — Termin potvrđen",
    "",
    `📅 ${event.date} u ${event.startTime}`,
    `💈 ${event.barberName}`,
    `✂️ ${event.serviceName}`,
    `💰 ${formatPrice(event.price)}`,
    "",
    `Potvrda: ${typeof window !== "undefined" ? window.location.origin : ""}/booking/${event.bookingId}`,
  ].join("\n");
}
