"use client";

import { useState, useEffect, useCallback } from "react";
import { format, parse } from "date-fns";
import { bs } from "date-fns/locale";

interface Schedule {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isWorking: boolean;
}

interface ClosedPeriod {
  id: string;
  startDate: string;
  endDate: string;
  reason: string | null;
}

interface BlockedSlot {
  id: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  allDay: boolean;
  reason: string | null;
}

const DAYS = [
  { id: 1, label: "Pon" },
  { id: 2, label: "Uto" },
  { id: 3, label: "Sri" },
  { id: 4, label: "Čet" },
  { id: 5, label: "Pet" },
  { id: 6, label: "Sub" },
  { id: 0, label: "Ned" },
];

const DEFAULT_SCHEDULE: Schedule[] = DAYS.map((d) => ({
  dayOfWeek: d.id,
  startTime: d.id === 6 ? "09:00" : "09:00",
  endTime: d.id === 6 ? "17:00" : "19:00",
  isWorking: d.id !== 0,
}));

export default function BarberSettings() {
  const [schedules, setSchedules] = useState<Schedule[]>(DEFAULT_SCHEDULE);
  const [periods, setPeriods] = useState<ClosedPeriod[]>([]);
  const [blocks, setBlocks] = useState<BlockedSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [periodReason, setPeriodReason] = useState("");

  const [blockDate, setBlockDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [blockAllDay, setBlockAllDay] = useState(false);
  const [blockStart, setBlockStart] = useState("12:00");
  const [blockEnd, setBlockEnd] = useState("14:00");
  const [blockReason, setBlockReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/barber/settings", { credentials: "same-origin" });
    if (res.ok) {
      const data = await res.json();
      if (data.schedules?.length) {
        const merged = DEFAULT_SCHEDULE.map((def) => {
          const found = data.schedules.find(
            (s: Schedule) => s.dayOfWeek === def.dayOfWeek
          );
          return found || def;
        });
        setSchedules(merged);
      }
      setPeriods(data.closedPeriods || []);
      setBlocks(data.blockedSlots || []);
    } else {
      const data = await res.json().catch(() => ({}));
      setMessage(data.error || "Greška pri učitavanju postavki");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function showMsg(text: string) {
    setMessage(text);
    setTimeout(() => setMessage(""), 3000);
  }

  function updateSchedule(dayOfWeek: number, patch: Partial<Schedule>) {
    setSchedules((prev) =>
      prev.map((s) => (s.dayOfWeek === dayOfWeek ? { ...s, ...patch } : s))
    );
  }

  async function saveSchedule() {
    setSaving(true);
    const res = await fetch("/api/barber/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ schedules }),
    });
    if (res.ok) showMsg("Radno vrijeme sačuvano");
    else {
      const data = await res.json();
      alert(data.error || "Greška");
    }
    setSaving(false);
  }

  async function addPeriod() {
    if (!periodStart || !periodEnd) return;
    const res = await fetch("/api/barber/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        type: "period",
        startDate: periodStart,
        endDate: periodEnd,
        reason: periodReason || "Odsustvo",
      }),
    });
    if (res.ok) {
      setPeriodStart("");
      setPeriodEnd("");
      setPeriodReason("");
      showMsg("Period odsustva dodan");
      load();
    } else {
      const data = await res.json();
      alert(data.error || "Greška");
    }
  }

  async function addBlock() {
    const res = await fetch("/api/barber/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        type: "block",
        date: blockDate,
        allDay: blockAllDay,
        startTime: blockAllDay ? null : blockStart,
        endTime: blockAllDay ? null : blockEnd,
        reason: blockReason || null,
      }),
    });
    if (res.ok) {
      setBlockReason("");
      showMsg("Blokada dodana");
      load();
    } else {
      const data = await res.json();
      alert(data.error || "Greška");
    }
  }

  async function removeItem(type: "period" | "block", id: string) {
    const res = await fetch(`/api/barber/settings?type=${type}&id=${id}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    if (res.ok) load();
  }

  function fmtDate(d: string) {
    return format(parse(d, "yyyy-MM-dd", new Date()), "d. MMM yyyy.", { locale: bs });
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-gold)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      {message && (
        <div className="rounded-xl bg-[var(--color-gold)]/10 border border-[var(--color-gold)]/30 px-4 py-3 text-sm text-[var(--color-gold)] text-center animate-fade-in">
          {message}
        </div>
      )}

      {/* Weekly schedule */}
      <section>
        <h2 className="font-[family-name:var(--font-display)] font-semibold mb-1">
          Radno vrijeme
        </h2>
        <p className="text-[var(--color-cream-muted)] text-xs mb-4">
          Podesite kada ste dostupni za rezervacije
        </p>

        <div className="space-y-2">
          {DAYS.map((day) => {
            const s = schedules.find((x) => x.dayOfWeek === day.id)!;
            return (
              <div
                key={day.id}
                className={`rounded-xl border p-3 transition-colors ${
                  s.isWorking
                    ? "bg-[var(--color-bg-card)] border-[var(--color-border)]"
                    : "bg-[var(--color-bg)] border-[var(--color-border)] opacity-60"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm w-10">{day.label}</span>
                  <button
                    type="button"
                    onClick={() => updateSchedule(day.id, { isWorking: !s.isWorking })}
                    className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                      s.isWorking
                        ? "border-[var(--color-gold)]/40 text-[var(--color-gold)]"
                        : "border-[var(--color-border)] text-[var(--color-cream-muted)]"
                    }`}
                  >
                    {s.isWorking ? "Radim" : "Ne radim"}
                  </button>
                </div>
                {s.isWorking && (
                  <div className="flex gap-2">
                    <input
                      type="time"
                      value={s.startTime}
                      onChange={(e) => updateSchedule(day.id, { startTime: e.target.value })}
                      className="flex-1 h-10 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] px-2 text-sm"
                    />
                    <span className="text-[var(--color-cream-muted)] self-center">–</span>
                    <input
                      type="time"
                      value={s.endTime}
                      onChange={(e) => updateSchedule(day.id, { endTime: e.target.value })}
                      className="flex-1 h-10 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] px-2 text-sm"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button
          onClick={saveSchedule}
          disabled={saving}
          className="w-full h-12 mt-4 rounded-xl gold-gradient font-semibold text-[var(--color-bg)] text-sm disabled:opacity-50"
        >
          {saving ? "Čuvanje..." : "Sačuvaj radno vrijeme"}
        </button>
      </section>

      {/* Date range off */}
      <section>
        <h2 className="font-[family-name:var(--font-display)] font-semibold mb-1">
          Odsustvo
        </h2>
        <p className="text-[var(--color-cream-muted)] text-xs mb-4">
          Npr. godišnji odmor — klijenti ne mogu zakazivati u tom periodu
        </p>

        <div className="rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border)] p-4 space-y-3">
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-[var(--color-cream-muted)] mb-1 block">Od</label>
              <input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className="w-full h-11 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] px-3 text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-[var(--color-cream-muted)] mb-1 block">Do</label>
              <input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="w-full h-11 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] px-3 text-sm"
              />
            </div>
          </div>
          <input
            value={periodReason}
            onChange={(e) => setPeriodReason(e.target.value)}
            placeholder="Razlog (npr. Godišnji odmor)"
            className="w-full h-11 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] px-3 text-sm"
          />
          <button
            onClick={addPeriod}
            disabled={!periodStart || !periodEnd}
            className="w-full h-11 rounded-lg border border-dashed border-[var(--color-gold)]/40 text-[var(--color-gold)] text-sm disabled:opacity-40"
          >
            + Dodaj period odsustva
          </button>
        </div>

        {periods.length > 0 && (
          <div className="mt-3 space-y-2">
            {periods.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border)] px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium">
                    {fmtDate(p.startDate)}
                    {p.startDate !== p.endDate && ` – ${fmtDate(p.endDate)}`}
                  </p>
                  {p.reason && (
                    <p className="text-xs text-[var(--color-cream-muted)] mt-0.5">{p.reason}</p>
                  )}
                </div>
                <button
                  onClick={() => removeItem("period", p.id)}
                  className="text-xs text-red-400 px-2 py-1"
                >
                  Ukloni
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Partial day block */}
      <section>
        <h2 className="font-[family-name:var(--font-display)] font-semibold mb-1">
          Blokiraj termin
        </h2>
        <p className="text-[var(--color-cream-muted)] text-xs mb-4">
          Npr. pauza 12–14h ili cijeli dan slobodan
        </p>

        <div className="rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border)] p-4 space-y-3">
          <div>
            <label className="text-xs text-[var(--color-cream-muted)] mb-1 block">Datum</label>
            <input
              type="date"
              value={blockDate}
              onChange={(e) => setBlockDate(e.target.value)}
              className="w-full h-11 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] px-3 text-sm"
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={blockAllDay}
              onChange={(e) => setBlockAllDay(e.target.checked)}
              className="rounded"
            />
            Cijeli dan
          </label>

          {!blockAllDay && (
            <div className="flex gap-2">
              <input
                type="time"
                value={blockStart}
                onChange={(e) => setBlockStart(e.target.value)}
                className="flex-1 h-11 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] px-3 text-sm"
              />
              <span className="self-center text-[var(--color-cream-muted)]">–</span>
              <input
                type="time"
                value={blockEnd}
                onChange={(e) => setBlockEnd(e.target.value)}
                className="flex-1 h-11 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] px-3 text-sm"
              />
            </div>
          )}

          <input
            value={blockReason}
            onChange={(e) => setBlockReason(e.target.value)}
            placeholder="Napomena (opcionalno)"
            className="w-full h-11 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] px-3 text-sm"
          />

          <button
            onClick={addBlock}
            className="w-full h-11 rounded-lg border border-dashed border-[var(--color-gold)]/40 text-[var(--color-gold)] text-sm"
          >
            + Dodaj blokadu
          </button>
        </div>

        {blocks.length > 0 && (
          <div className="mt-3 space-y-2">
            {blocks.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border)] px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium">{fmtDate(b.date)}</p>
                  <p className="text-xs text-[var(--color-cream-muted)]">
                    {b.allDay
                      ? "Cijeli dan"
                      : `${b.startTime} – ${b.endTime}`}
                    {b.reason && ` · ${b.reason}`}
                  </p>
                </div>
                <button
                  onClick={() => removeItem("block", b.id)}
                  className="text-xs text-red-400 px-2 py-1"
                >
                  Ukloni
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
