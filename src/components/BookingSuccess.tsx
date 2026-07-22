"use client";

import { useState, useEffect } from "react";
import { format, parse } from "date-fns";
import { bs } from "date-fns/locale";
import QRCode from "react-qr-code";
import {
  downloadIcs,
  buildGoogleCalendarUrl,
  buildShareText,
  type CalendarEvent,
} from "@/lib/calendar";
import { formatPrice } from "@/lib/booking-utils";
import { usePwaInstall } from "@/hooks/usePwaInstall";

interface BookingSuccessProps {
  bookingId: string;
  barberName: string;
  barberColor: string;
  serviceName: string;
  price: number;
  durationMinutes: number;
  date: string;
  startTime: string;
  customerName: string;
  onNewBooking: () => void;
}

export default function BookingSuccess({
  bookingId,
  barberName,
  barberColor,
  serviceName,
  price,
  durationMinutes,
  date,
  startTime,
  customerName,
  onNewBooking,
}: BookingSuccessProps) {
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [shareSupported, setShareSupported] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showIosInstall, setShowIosInstall] = useState(false);
  const [showAndroidInstall, setShowAndroidInstall] = useState(false);
  const [installing, setInstalling] = useState(false);
  const { canInstall, isIosDevice, isAndroidDevice, hasNativePrompt, install } = usePwaInstall();

  const confirmUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/booking/${bookingId}`
      : `/booking/${bookingId}`;

  useEffect(() => {
    setShareSupported(typeof navigator !== "undefined" && !!navigator.share);
  }, []);

  const calendarEvent: CalendarEvent = {
    title: `Glory 4 Nix — ${serviceName}`,
    description: `Barber: ${barberName}\nUsluga: ${serviceName}\nCijena: ${formatPrice(price)}\n\nPotvrda: ${confirmUrl}`,
    location: "Glory 4 Nix Barbershop",
    date,
    startTime,
    durationMinutes,
    bookingId,
  };

  function formatDateFull(dateStr: string) {
    const d = parse(dateStr, "yyyy-MM-dd", new Date());
    return format(d, "EEEE, d. MMMM", { locale: bs });
  }

  async function handleShare() {
    const text = buildShareText({
      ...calendarEvent,
      barberName,
      serviceName,
      price,
    });

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Glory 4 Nix — Termin",
          text,
          url: confirmUrl,
        });
        setSaved(true);
        return;
      } catch {
        /* user cancelled */
      }
    }

    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function handleAddToCalendar() {
    downloadIcs(calendarEvent);
    setSaved(true);
  }

  function handleGoogleCalendar() {
    window.open(buildGoogleCalendarUrl(calendarEvent), "_blank");
    setSaved(true);
  }

  async function handleInstallApp() {
    if (isIosDevice) {
      setShowIosInstall((v) => !v);
      return;
    }

    if (!hasNativePrompt && isAndroidDevice) {
      setShowAndroidInstall((v) => !v);
      return;
    }

    setInstalling(true);
    await install();
    setInstalling(false);
  }

  return (
    <div className="flex min-h-dvh flex-col px-5 py-8 pb-10 safe-bottom">
      {/* Success header */}
      <div className="flex flex-col items-center pt-4 mb-6">
        <div className="relative mb-5">
          <div className="success-ring" />
          <div className="relative flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full gold-gradient animate-success-pop">
            <svg
              className="h-9 w-9 text-[var(--color-bg)] success-check"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
        <h2
          className="font-[family-name:var(--font-display)] text-2xl font-bold text-center animate-fade-up"
          style={{ animationDelay: "0.15s" }}
        >
          Termin potvrđen
        </h2>
        <p
          className="text-[var(--color-cream-muted)] text-center mt-1.5 animate-fade-up"
          style={{ animationDelay: "0.2s" }}
        >
          {customerName}, vidimo se uskoro!
        </p>
      </div>

      {/* Ticket card */}
      <div
        className="ticket-card mx-auto w-full max-w-sm animate-fade-up"
        style={{ animationDelay: "0.25s" }}
      >
        <div className="ticket-notch ticket-notch-left" />
        <div className="ticket-notch ticket-notch-right" />

        <div className="rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border)] overflow-hidden">
          <div className="h-1 gold-gradient" />

          <div className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <div
                className="flex h-11 w-11 items-center justify-center rounded-xl text-lg font-bold text-[var(--color-bg)]"
                style={{ backgroundColor: barberColor }}
              >
                {barberName[0]}
              </div>
              <div>
                <p className="font-[family-name:var(--font-display)] font-semibold">
                  {barberName}
                </p>
                <p className="text-[var(--color-cream-muted)] text-sm">{serviceName}</p>
              </div>
            </div>

            <div className="flex items-baseline gap-2 mb-1">
              <span className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--color-gold)]">
                {startTime}
              </span>
              <span className="text-[var(--color-cream-muted)] text-sm capitalize">
                {formatDateFull(date)}
              </span>
            </div>

            <p className="text-[var(--color-cream-muted)] text-xs mt-2">
              {durationMinutes} min · {formatPrice(price)}
            </p>
          </div>

          <div className="ticket-divider mx-5" />

          <div className="px-5 pb-5 pt-4">
            <p className="text-[var(--color-cream-muted)] text-xs mb-1">Broj potvrde</p>
            <p className="font-mono text-xs text-[var(--color-cream)]/70 tracking-wider">
              {bookingId.slice(0, 12).toUpperCase()}
            </p>
          </div>
        </div>
      </div>

      {/* Save actions */}
      <div
        className="mx-auto w-full max-w-sm mt-6 space-y-2.5 animate-fade-up"
        style={{ animationDelay: "0.35s" }}
      >
        <p className="text-[var(--color-cream-muted)] text-xs font-medium uppercase tracking-wider text-center mb-3">
          Sačuvaj termin
        </p>

        <button
          onClick={handleAddToCalendar}
          className="action-btn action-btn-primary w-full"
        >
          <CalendarIcon />
          <span>Dodaj u kalendar</span>
          <span className="action-badge">Apple · Outlook</span>
        </button>

        <button
          onClick={handleGoogleCalendar}
          className="action-btn w-full"
        >
          <GoogleIcon />
          <span>Google Calendar</span>
        </button>

        <div className="grid grid-cols-2 gap-2.5">
          <button onClick={handleShare} className="action-btn">
            <ShareIcon />
            <span>{copied ? "Kopirano!" : shareSupported ? "Podijeli" : "Kopiraj"}</span>
          </button>
          <button
            onClick={() => setShowQr(!showQr)}
            className={`action-btn ${showQr ? "border-[var(--color-gold)]/40" : ""}`}
          >
            <QrIcon />
            <span>QR kod</span>
          </button>
        </div>

        {showQr && (
          <div className="qr-panel animate-scale-in">
            <div className="bg-white p-4 rounded-xl inline-block mx-auto">
              <QRCode
                value={confirmUrl}
                size={160}
                level="M"
                bgColor="#FFFFFF"
                fgColor="#0A0A0A"
              />
            </div>
            <p className="text-[var(--color-cream-muted)] text-xs text-center mt-3">
              Skenirajte za brzi pristup potvrdi
            </p>
          </div>
        )}

        {saved && (
          <p className="text-[var(--color-gold)] text-xs text-center animate-fade-in pt-1">
            Termin sačuvan ✓
          </p>
        )}
      </div>

      {canInstall && (
        <div
          className="mx-auto w-full max-w-sm mt-6 animate-fade-up"
          style={{ animationDelay: "0.4s" }}
        >
          <div className="rounded-2xl border border-[var(--color-gold)]/20 bg-[var(--color-bg-card)] p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl gold-gradient">
                <PhoneIcon />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-[family-name:var(--font-display)] font-semibold text-sm">
                  Želite brži pristup?
                </p>
                <p className="text-[var(--color-cream-muted)] text-xs mt-1 leading-relaxed">
                  Instalirajte aplikaciju na telefon — zakazivanje u jednom dodiru, bez pretraživača.
                </p>
              </div>
            </div>

            <button
              onClick={handleInstallApp}
              disabled={installing}
              className="action-btn action-btn-primary w-full mt-4"
            >
              <DownloadIcon />
              <span>
                {installing
                  ? "Instaliranje..."
                  : isIosDevice
                  ? showIosInstall
                    ? "Sakrij upute"
                    : "Dodaj na početni ekran"
                  : showAndroidInstall
                  ? "Sakrij upute"
                  : "Instaliraj aplikaciju"}
              </span>
            </button>

            {showAndroidInstall && isAndroidDevice && !hasNativePrompt && (
              <div className="mt-3 rounded-xl bg-[var(--color-bg)]/60 border border-[var(--color-border)] px-3 py-3 text-xs text-[var(--color-cream-muted)] leading-relaxed animate-fade-in">
                <p className="font-medium text-[var(--color-cream)] mb-2">Android:</p>
                <ol className="space-y-1.5 list-decimal list-inside">
                  <li>Dodirni meni <strong className="text-[var(--color-cream)]">⋮</strong> u browseru</li>
                  <li>Odaberi <strong className="text-[var(--color-cream)]">Instaliraj aplikaciju</strong></li>
                  <li>Potvrdi instalaciju</li>
                </ol>
              </div>
            )}

            {showIosInstall && isIosDevice && (
              <div className="mt-3 rounded-xl bg-[var(--color-bg)]/60 border border-[var(--color-border)] px-3 py-3 text-xs text-[var(--color-cream-muted)] leading-relaxed animate-fade-in">
                <p className="font-medium text-[var(--color-cream)] mb-2">iPhone / iPad:</p>
                <ol className="space-y-1.5 list-decimal list-inside">
                  <li>Dodirni <strong className="text-[var(--color-cream)]">Share</strong> (kvadrat sa strelicom)</li>
                  <li>Odaberi <strong className="text-[var(--color-cream)]">Add to Home Screen</strong></li>
                  <li>Dodirni <strong className="text-[var(--color-cream)]">Add</strong></li>
                </ol>
              </div>
            )}
          </div>
        </div>
      )}

      <button
        onClick={onNewBooking}
        className="mt-8 mx-auto text-[var(--color-cream-muted)] text-sm hover:text-[var(--color-gold)] transition-colors animate-fade-up"
        style={{ animationDelay: "0.45s" }}
      >
        Zakaži novi termin
      </button>
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg className="h-5 w-5 shrink-0 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5 shrink-0 opacity-70" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 11.4V14h6.3c-.3 1.5-1.7 4.4-6.3 4.4-3.8 0-6.9-3.1-6.9-7s3.1-7 6.9-7c1.9 0 3.2.8 3.9 1.5l2.7-2.6C17.2 2.3 14.8 1 12 1 6.5 1 2 5.5 2 11s4.5 10 10 10c5.8 0 9.6-4.1 9.6-9.9 0-.7-.1-1.2-.2-1.6H12z" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg className="h-5 w-5 shrink-0 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
    </svg>
  );
}

function QrIcon() {
  return (
    <svg className="h-5 w-5 shrink-0 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12-2h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg className="h-5 w-5 text-[var(--color-bg)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg className="h-5 w-5 shrink-0 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}
