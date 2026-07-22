"use client";

import { format, parse } from "date-fns";
import { bs } from "date-fns/locale";
import QRCode from "react-qr-code";
import Link from "next/link";
import { formatPrice } from "@/lib/booking-utils";

interface BookingConfirmationProps {
  booking: {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    customerName: string;
    barberName: string;
    barberColor: string;
    serviceName: string;
    price: number;
    durationMinutes: number;
  };
}

export default function BookingConfirmation({ booking }: BookingConfirmationProps) {
  const confirmUrl =
    typeof window !== "undefined"
      ? window.location.href
      : `/booking/${booking.id}`;

  function formatDateFull(dateStr: string) {
    const d = parse(dateStr, "yyyy-MM-dd", new Date());
    return format(d, "EEEE, d. MMMM yyyy.", { locale: bs });
  }

  return (
    <div className="flex min-h-dvh flex-col items-center px-5 py-10 safe-bottom animate-fade-in">
      <Link
        href="/"
        className="font-[family-name:var(--font-display)] text-xs font-semibold tracking-[0.2em] uppercase text-[var(--color-gold)] mb-8"
      >
        Glory 4 Nix
      </Link>

      <div className="ticket-card w-full max-w-sm animate-fade-up">
        <div className="ticket-notch ticket-notch-left" />
        <div className="ticket-notch ticket-notch-right" />

        <div className="rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border)] overflow-hidden">
          <div className="h-1 gold-gradient" />
          <div className="p-5">
            <p className="text-[var(--color-cream-muted)] text-xs uppercase tracking-wider mb-4">
              Potvrda termina
            </p>

            <div className="flex items-center gap-3 mb-5">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-xl text-lg font-bold text-[var(--color-bg)]"
                style={{ backgroundColor: booking.barberColor }}
              >
                {booking.barberName[0]}
              </div>
              <div>
                <p className="font-[family-name:var(--font-display)] font-semibold text-lg">
                  {booking.barberName}
                </p>
                <p className="text-[var(--color-cream-muted)] text-sm">{booking.serviceName}</p>
              </div>
            </div>

            <div className="space-y-2">
              <div>
                <p className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--color-gold)]">
                  {booking.startTime} — {booking.endTime}
                </p>
                <p className="text-[var(--color-cream-muted)] text-sm capitalize mt-0.5">
                  {formatDateFull(booking.date)}
                </p>
              </div>
              <p className="text-sm text-[var(--color-cream-muted)]">
                {booking.customerName} · {booking.durationMinutes} min · {formatPrice(booking.price)}
              </p>
            </div>
          </div>

          <div className="ticket-divider mx-5" />

          <div className="p-5 flex flex-col items-center">
            <div className="bg-white p-3 rounded-xl">
              <QRCode value={confirmUrl} size={120} level="M" bgColor="#FFFFFF" fgColor="#0A0A0A" />
            </div>
            <p className="text-[var(--color-cream-muted)] text-xs mt-3 text-center">
              Skenirajte za brzi pristup
            </p>
          </div>
        </div>
      </div>

      <a
        href={`/api/bookings/${booking.id}/calendar`}
        className="action-btn action-btn-primary w-full max-w-sm mt-6"
      >
        Dodaj u kalendar
      </a>

      <Link
        href="/"
        className="mt-6 text-[var(--color-cream-muted)] text-sm hover:text-[var(--color-gold)] transition-colors"
      >
        Zakaži novi termin
      </Link>
    </div>
  );
}
