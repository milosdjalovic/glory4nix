"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { format, parse } from "date-fns";
import { bs } from "date-fns/locale";
import BookingSuccess from "@/components/BookingSuccess";
import { formatPrice } from "@/lib/booking-utils";

interface Barber {
  id: string;
  name: string;
  slug: string;
  accentColor: string;
}

interface Service {
  id: string;
  name: string;
  description: string | null;
  price: number;
  durationMinutes: number;
}

type Step = "barber" | "service" | "datetime" | "details" | "confirm" | "success";

const STEPS: Step[] = ["barber", "service", "datetime", "details", "confirm"];

export default function BookingWizard() {
  const [step, setStep] = useState<Step>("barber");
  const [stepDirection, setStepDirection] = useState<"forward" | "back">("forward");
  const stepKey = useRef(0);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [dateAvailability, setDateAvailability] = useState<Record<string, number>>({});
  const [dateInfo, setDateInfo] = useState<Record<string, { status: string; message: string | null }>>({});
  const [selectedDateMessage, setSelectedDateMessage] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [bookingId, setBookingId] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/barbers").then((r) => r.json()),
      fetch("/api/services").then((r) => r.json()),
    ]).then(([b, s]) => {
      setBarbers(b);
      setServices(s);
      setLoading(false);
    });
  }, []);

  const fetchDates = useCallback(async (barberId: string, serviceId: string) => {
    const res = await fetch(`/api/slots?barberId=${barberId}&serviceId=${serviceId}`);
    const data = await res.json();
    setAvailableDates(data.dates);
    setDateAvailability(data.availability);
    setDateInfo(data.dateInfo || {});
    const firstAvailable = data.dates.find((d: string) => data.availability[d] > 0);
    if (firstAvailable) setSelectedDate(firstAvailable);
    else if (data.dates.length) setSelectedDate(data.dates[0]);
  }, []);

  const fetchSlots = useCallback(async (barberId: string, serviceId: string, date: string) => {
    setLoadingSlots(true);
    const res = await fetch(
      `/api/slots?barberId=${barberId}&serviceId=${serviceId}&date=${date}`
    );
    const data = await res.json();
    setSlots(data.slots || []);
    setSelectedDateMessage(data.message || null);
    setLoadingSlots(false);
  }, []);

  useEffect(() => {
    if (selectedBarber && selectedService) {
      fetchDates(selectedBarber.id, selectedService.id);
    }
  }, [selectedBarber, selectedService, fetchDates]);

  useEffect(() => {
    if (selectedBarber && selectedService && selectedDate) {
      fetchSlots(selectedBarber.id, selectedService.id, selectedDate);
      setSelectedTime("");
    }
  }, [selectedBarber, selectedService, selectedDate, fetchSlots]);

  const currentStepIndex = STEPS.indexOf(step);

  function goTo(s: Step, direction: "forward" | "back" = "forward") {
    setError("");
    setStepDirection(direction);
    stepKey.current += 1;
    setStep(s);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function next() {
    const idx = STEPS.indexOf(step);
    if (idx < STEPS.length - 1) goTo(STEPS[idx + 1], "forward");
  }

  function back() {
    const idx = STEPS.indexOf(step);
    if (idx > 0) goTo(STEPS[idx - 1], "back");
  }

  async function handleSubmit() {
    if (!selectedBarber || !selectedService || !selectedDate || !selectedTime) return;
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barberId: selectedBarber.id,
          serviceId: selectedService.id,
          date: selectedDate,
          startTime: selectedTime,
          customerName,
          customerPhone,
          customerEmail,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Greška pri rezervaciji");
        if (res.status === 409) {
          fetchSlots(selectedBarber.id, selectedService.id, selectedDate);
        }
        return;
      }

      setBookingId(data.id);
      goTo("success", "forward");
    } catch {
      setError("Greška pri povezivanju. Pokušajte ponovo.");
    } finally {
      setSubmitting(false);
    }
  }

  function formatDateFull(dateStr: string) {
    const d = parse(dateStr, "yyyy-MM-dd", new Date());
    return format(d, "EEEE, d. MMMM yyyy.", { locale: bs });
  }

  function resetBooking() {
    setStep("barber");
    setSelectedBarber(null);
    setSelectedService(null);
    setSelectedDate("");
    setSelectedTime("");
    setCustomerName("");
    setCustomerPhone("");
    setCustomerEmail("");
    setBookingId("");
    stepKey.current += 1;
  }

  const stepAnimClass =
    stepDirection === "forward" ? "step-enter-forward" : "step-enter-back";

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-gold)] border-t-transparent" />
      </div>
    );
  }

  if (step === "success" && selectedBarber && selectedService) {
    return (
      <BookingSuccess
        bookingId={bookingId}
        barberName={selectedBarber.name}
        barberColor={selectedBarber.accentColor}
        serviceName={selectedService.name}
        price={selectedService.price}
        durationMinutes={selectedService.durationMinutes}
        date={selectedDate}
        startTime={selectedTime}
        customerName={customerName}
        onNewBooking={resetBooking}
      />
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[var(--color-bg)]/90 backdrop-blur-xl border-b border-[var(--color-border)]">
        <div className="px-5 pt-4 pb-3">
          <div className="flex items-center justify-between mb-4">
            {step !== "barber" ? (
              <button onClick={back} className="flex items-center gap-1 text-[var(--color-cream-muted)] text-sm -ml-1 p-1">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Nazad
              </button>
            ) : (
              <div />
            )}
            <span className="font-[family-name:var(--font-display)] text-xs font-semibold tracking-[0.2em] uppercase text-[var(--color-gold)]">
              Glory 4 Nix
            </span>
            <div className="w-12" />
          </div>

          {step === "barber" && (
            <div className="animate-fade-up">
              <h1 className="font-[family-name:var(--font-display)] text-[1.75rem] font-bold leading-tight">
                Zakažite <span className="gold-text">termin</span>
              </h1>
              <p className="text-[var(--color-cream-muted)] text-sm mt-1">
                Brzo, jednostavno, bez čekanja.
              </p>
            </div>
          )}

          {step !== "barber" && (
            <h2 className="font-[family-name:var(--font-display)] text-xl font-bold animate-fade-up">
              {step === "service" && "Odaberite uslugu"}
              {step === "datetime" && "Odaberite termin"}
              {step === "details" && "Vaši podaci"}
              {step === "confirm" && "Potvrdite rezervaciju"}
            </h2>
          )}

          {/* Progress */}
          <div className="flex gap-1.5 mt-4">
            {STEPS.map((s, i) => (
              <div
                key={s}
                className={`progress-segment h-1 flex-1 rounded-full ${
                  i <= currentStepIndex ? "gold-gradient active" : "bg-[var(--color-border)]"
                }`}
                style={{ animationDelay: `${i * 0.05}s` }}
              />
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-5 py-6 pb-32" key={stepKey.current}>
        {error && (
          <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400 animate-fade-in">
            {error}
          </div>
        )}

        {/* Step: Barber */}
        {step === "barber" && (
          <div className={`space-y-3 ${stepAnimClass}`}>
            {barbers.map((barber, i) => (
              <button
                key={barber.id}
                onClick={() => {
                  setSelectedBarber(barber);
                  next();
                }}
                style={{ animationDelay: `${i * 0.05}s` }}
                className={`interactive-card w-full flex items-center gap-4 rounded-2xl bg-[var(--color-bg-card)] border p-4 animate-fade-up ${
                  selectedBarber?.id === barber.id
                    ? "border-[var(--color-gold)] ring-1 ring-[var(--color-gold)]/30"
                    : "border-[var(--color-border)] hover:border-[var(--color-border-light)]"
                }`}
              >
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-xl text-xl font-bold text-[var(--color-bg)]"
                  style={{ backgroundColor: barber.accentColor }}
                >
                  {barber.name[0]}
                </div>
                <div className="flex-1 text-left">
                  <p className="font-[family-name:var(--font-display)] text-lg font-semibold">
                    {barber.name}
                  </p>
                  <p className="text-[var(--color-cream-muted)] text-sm">Barber</p>
                </div>
                <svg className="h-5 w-5 text-[var(--color-cream-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        )}

        {/* Step: Service */}
        {step === "service" && (
          <div className={`space-y-3 ${stepAnimClass}`}>
            {selectedBarber && (
              <div className="flex items-center gap-2 mb-4 text-sm text-[var(--color-cream-muted)] animate-fade-in">
                <div
                  className="h-6 w-6 rounded-md flex items-center justify-center text-xs font-bold text-[var(--color-bg)]"
                  style={{ backgroundColor: selectedBarber.accentColor }}
                >
                  {selectedBarber.name[0]}
                </div>
                {selectedBarber.name}
              </div>
            )}
            {services.map((service, i) => (
              <button
                key={service.id}
                onClick={() => {
                  setSelectedService(service);
                  next();
                }}
                style={{ animationDelay: `${i * 0.05}s` }}
                className={`interactive-card w-full rounded-2xl bg-[var(--color-bg-card)] border p-4 text-left animate-fade-up ${
                  selectedService?.id === service.id
                    ? "border-[var(--color-gold)] ring-1 ring-[var(--color-gold)]/30"
                    : "border-[var(--color-border)]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-[family-name:var(--font-display)] font-semibold">
                      {service.name}
                    </p>
                    {service.description && (
                      <p className="text-[var(--color-cream-muted)] text-sm mt-0.5">
                        {service.description}
                      </p>
                    )}
                    <p className="text-[var(--color-cream-muted)] text-xs mt-2">
                      {service.durationMinutes} min
                    </p>
                  </div>
                  <span className="font-[family-name:var(--font-display)] text-lg font-bold text-[var(--color-gold)]">
                    {formatPrice(service.price)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Step: Date & Time */}
        {step === "datetime" && (
          <div className={stepAnimClass}>
            {/* Date picker */}
            <p className="text-sm text-[var(--color-cream-muted)] mb-3 font-medium">Datum</p>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-6 -mx-5 px-5">
              {availableDates.map((date) => {
                const avail = dateAvailability[date] ?? 0;
                const info = dateInfo[date];
                const isSelected = selectedDate === date;
                const isUnavailable = avail === 0;
                const isClosed = info?.status === "closed" || info?.status === "off";
                return (
                  <button
                    key={date}
                    disabled={isUnavailable && !isSelected}
                    onClick={() => setSelectedDate(date)}
                    className={`date-chip flex-shrink-0 flex flex-col items-center rounded-xl px-4 py-3 min-w-[4.5rem] ${
                      isSelected
                        ? isUnavailable
                          ? "bg-[var(--color-bg-card)] border-2 border-[var(--color-cream-muted)]/50 text-[var(--color-cream-muted)]"
                          : "gold-gradient text-[var(--color-bg)] font-semibold"
                        : isUnavailable
                        ? "bg-[var(--color-bg-card)] text-[var(--color-cream-muted)]/35 cursor-not-allowed border border-transparent"
                        : "bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-cream)]"
                    }`}
                  >
                    <span className="text-xs uppercase tracking-wide opacity-70">
                      {format(parse(date, "yyyy-MM-dd", new Date()), "EEE", { locale: bs })}
                    </span>
                    <span className="text-lg font-bold font-[family-name:var(--font-display)]">
                      {format(parse(date, "yyyy-MM-dd", new Date()), "d")}
                    </span>
                    <span className="text-[10px] opacity-60">
                      {isClosed ? "—" : format(parse(date, "yyyy-MM-dd", new Date()), "MMM", { locale: bs })}
                    </span>
                  </button>
                );
              })}
            </div>

            {selectedDate && dateInfo[selectedDate]?.message && (dateAvailability[selectedDate] ?? 0) === 0 && (
              <div className="mb-4 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border)] px-4 py-3 flex items-start gap-3 animate-fade-in">
                <span className="text-lg opacity-50 mt-0.5">✂️</span>
                <div>
                  <p className="text-sm font-medium text-[var(--color-cream-muted)]">
                    {selectedBarber?.name} ne radi
                  </p>
                  <p className="text-xs text-[var(--color-cream-muted)]/70 mt-0.5">
                    {dateInfo[selectedDate].message}
                  </p>
                </div>
              </div>
            )}

            {/* Time slots */}
            <p className="text-sm text-[var(--color-cream-muted)] mb-3 font-medium">Vrijeme</p>
            {loadingSlots ? (
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="h-12 rounded-xl skeleton" />
                ))}
              </div>
            ) : slots.length === 0 ? (
              <div className="text-center py-12 text-[var(--color-cream-muted)]">
                {selectedDateMessage ? (
                  <>
                    <p className="text-sm">{selectedDateMessage}</p>
                    <p className="text-xs mt-1">Odaberite drugi datum.</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm">Nema slobodnih termina za ovaj dan.</p>
                    <p className="text-xs mt-1">Odaberite drugi datum.</p>
                  </>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {slots.map((slot) => (
                  <button
                    key={slot}
                    onClick={() => setSelectedTime(slot)}
                    className={`slot-btn h-12 rounded-xl text-sm font-semibold ${
                      selectedTime === slot
                        ? "gold-gradient text-[var(--color-bg)]"
                        : "bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[var(--color-cream)]"
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step: Details */}
        {step === "details" && (
          <div className={`space-y-4 ${stepAnimClass}`}>
            <Field
              label="Ime i prezime"
              value={customerName}
              onChange={setCustomerName}
              placeholder="Vaše ime"
              required
              autoComplete="name"
            />
            <Field
              label="Telefon"
              value={customerPhone}
              onChange={setCustomerPhone}
              placeholder="+387 6X XXX XXX"
              required
              type="tel"
              autoComplete="tel"
            />
            <Field
              label="Email (opcionalno)"
              value={customerEmail}
              onChange={setCustomerEmail}
              placeholder="email@primjer.com"
              type="email"
              autoComplete="email"
            />
          </div>
        )}

        {/* Step: Confirm */}
        {step === "confirm" && (
          <div className={stepAnimClass}>
            <div className="rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border)] p-5 space-y-4">
              <Row label="Barber" value={selectedBarber?.name || ""} />
              <Row label="Usluga" value={selectedService?.name || ""} />
              <Row label="Trajanje" value={`${selectedService?.durationMinutes} min`} />
              <Row label="Datum" value={formatDateFull(selectedDate)} />
              <Row label="Vrijeme" value={selectedTime} />
              <div className="border-t border-[var(--color-border)] pt-4">
                <Row label="Ime" value={customerName} />
                <div className="mt-3">
                  <Row label="Telefon" value={customerPhone} />
                </div>
              </div>
              <div className="border-t border-[var(--color-border)] pt-4 flex justify-between items-center">
                <span className="text-[var(--color-cream-muted)] text-sm">Ukupno</span>
                <span className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--color-gold)]">
                  {formatPrice(selectedService?.price ?? 0)}
                </span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Bottom CTA */}
      {(step === "datetime" || step === "details" || step === "confirm") && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--color-bg)]/95 backdrop-blur-xl border-t border-[var(--color-border)] safe-bottom">
          <div className="px-5 py-4">
            {step === "datetime" && (
              <button
                disabled={!selectedDate || !selectedTime}
                onClick={next}
                className="w-full h-14 rounded-2xl gold-gradient font-[family-name:var(--font-display)] font-bold text-[var(--color-bg)] text-base disabled:opacity-40 transition-all active:scale-[0.98] animate-pulse-gold disabled:animate-none"
              >
                Nastavi
              </button>
            )}
            {step === "details" && (
              <button
                disabled={!customerName.trim() || customerPhone.trim().length < 6}
                onClick={next}
                className="w-full h-14 rounded-2xl gold-gradient font-[family-name:var(--font-display)] font-bold text-[var(--color-bg)] text-base disabled:opacity-40 transition-all active:scale-[0.98]"
              >
                Nastavi
              </button>
            )}
            {step === "confirm" && (
              <button
                disabled={submitting}
                onClick={handleSubmit}
                className="w-full h-14 rounded-2xl gold-gradient font-[family-name:var(--font-display)] font-bold text-[var(--color-bg)] text-base disabled:opacity-40 transition-all active:scale-[0.98]"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-bg)] border-t-transparent" />
                    Rezervisanje...
                  </span>
                ) : (
                  "Potvrdi rezervaciju"
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center gap-4">
      <span className="text-[var(--color-cream-muted)] text-sm">{label}</span>
      <span className={`text-sm font-medium text-right ${highlight ? "text-[var(--color-gold)] font-bold text-base" : ""}`}>
        {value}
      </span>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
  type = "text",
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <div>
      <label className="block text-sm text-[var(--color-cream-muted)] mb-2 font-medium">
        {label} {required && <span className="text-[var(--color-gold)]">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="w-full h-14 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border)] px-4 text-[var(--color-cream)] placeholder:text-[var(--color-cream-muted)]/50 focus:border-[var(--color-gold)] transition-colors duration-200"
      />
    </div>
  );
}
