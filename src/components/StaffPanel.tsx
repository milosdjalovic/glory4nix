"use client";

import { useState, useEffect, useCallback } from "react";
import { format, addDays, subDays, parse } from "date-fns";
import { bs } from "date-fns/locale";
import BarberSettings from "@/components/BarberSettings";
import BarberAppInstall from "@/components/BarberAppInstall";
import { formatPrice } from "@/lib/booking-utils";

interface Session {
  role: "admin" | "barber";
  barberId?: string;
  username: string;
}

interface Booking {
  id: string;
  customerName: string;
  customerPhone: string;
  date: string;
  startTime: string;
  endTime: string;
  barber: { id: string; name: string; accentColor: string };
  service: { name: string; price: number; durationMinutes: number };
}

interface Service {
  id: string;
  name: string;
  description: string | null;
  price: number;
  durationMinutes: number;
}

type Tab = "mine" | "availability" | "team" | "services";

export default function StaffPanel() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [teamBookings, setTeamBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("mine");

  const isAdmin = session?.role === "admin";

  useEffect(() => {
    fetch("/api/auth/session", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.authenticated && (data.role === "barber" || data.role === "admin")) {
          setAuthenticated(true);
          setSession(data);
        } else {
          setAuthenticated(false);
        }
      })
      .catch(() => setAuthenticated(false));
  }, []);

  const loadMySchedule = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/schedule?date=${date}`, { credentials: "same-origin" });
    if (res.ok) {
      const data = await res.json();
      setMyBookings(data.bookings);
    }
    setLoading(false);
  }, [date]);

  const loadTeamSchedule = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin?date=${date}`, { credentials: "same-origin" });
    if (res.ok) setTeamBookings(await res.json());
    setLoading(false);
  }, [date]);

  const loadServices = useCallback(async () => {
    const res = await fetch("/api/services");
    if (res.ok) setServices(await res.json());
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    if (tab === "mine") loadMySchedule();
    if (tab === "team") loadTeamSchedule();
    if (tab === "services") loadServices();
  }, [authenticated, tab, loadMySchedule, loadTeamSchedule, loadServices]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setLoginError(data.error);
      return;
    }
    if (data.role !== "barber" && data.role !== "admin") {
      setLoginError("Nemate pristup.");
      return;
    }
    setAuthenticated(true);
    setSession(data);
  }

  async function handleLogout() {
    await fetch("/api/auth/login", { method: "DELETE", credentials: "same-origin" });
    setAuthenticated(false);
    setSession(null);
  }

  async function cancelBooking(id: string, team = false) {
    setCancellingId(id);
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ action: "cancel" }),
      });
      if (!res.ok) {
        alert((await res.json()).error || "Greška");
        return;
      }
      if (team) setTeamBookings((p) => p.filter((b) => b.id !== id));
      else setMyBookings((p) => p.filter((b) => b.id !== id));
      setCancelConfirmId(null);
    } finally {
      setCancellingId(null);
    }
  }

  async function enablePush() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      const { publicKey } = await (await fetch("/api/push")).json();
      if (!publicKey) return;
      if ((await Notification.requestPermission()) !== "granted") return;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const json = sub.toJSON();
      await fetch("/api/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
      });
      setPushEnabled(true);
    } catch {
      /* ignore */
    }
  }

  if (authenticated === null) return <Spinner />;

  if (!authenticated) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-6">
        <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4 animate-fade-up">
          <div className="text-center mb-8">
            <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold">
              Staff <span className="gold-text">Panel</span>
            </h1>
            <p className="text-[var(--color-cream-muted)] text-sm mt-1">Glory 4 Nix</p>
          </div>
          {loginError && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
              {loginError}
            </div>
          )}
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Korisničko ime"
            className="w-full h-14 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border)] px-4"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Lozinka"
            className="w-full h-14 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border)] px-4"
          />
          <button type="submit" className="w-full h-14 rounded-2xl gold-gradient font-[family-name:var(--font-display)] font-bold text-[var(--color-bg)]">
            Prijava
          </button>
          <a href="/" className="block text-center text-[var(--color-cream-muted)] text-sm mt-2">
            ← Nazad na website
          </a>
          <BarberAppInstall />
        </form>
      </div>
    );
  }

  const today = format(new Date(), "yyyy-MM-dd");
  const tabs: { id: Tab; label: string; adminOnly?: boolean }[] = [
    { id: "mine", label: "Moji termini" },
    { id: "availability", label: "Dostupnost" },
    { id: "team", label: "Barberi", adminOnly: true },
    { id: "services", label: "Usluge", adminOnly: true },
  ];

  const visibleTabs = tabs.filter((t) => !t.adminOnly || isAdmin);
  const showDateNav = tab === "mine" || tab === "team";

  const teamGroups = teamBookings.reduce<Record<string, Booking[]>>((acc, b) => {
    const key = b.barber.name;
    if (!acc[key]) acc[key] = [];
    acc[key].push(b);
    return acc;
  }, {});

  return (
    <div className="min-h-dvh pb-8">
      <header className="sticky top-0 z-50 bg-[var(--color-bg)]/90 backdrop-blur-xl border-b border-[var(--color-border)] px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-[family-name:var(--font-display)] text-lg font-bold capitalize">
                {session?.username}
              </h1>
              {isAdmin && (
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-[var(--color-gold)]/40 text-[var(--color-gold)]">
                  Admin
                </span>
              )}
            </div>
            <p className="text-[var(--color-cream-muted)] text-xs">
              {tab === "mine" && "Vaši termini"}
              {tab === "availability" && "Radno vrijeme i odsustva"}
              {tab === "team" && "Raspored cijelog tima"}
              {tab === "services" && "Upravljanje uslugama"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!pushEnabled && session?.barberId && (
              <button onClick={enablePush} className="text-xs text-[var(--color-gold)] border border-[var(--color-gold)]/30 rounded-full px-3 py-1.5">
                🔔
              </button>
            )}
            <button onClick={handleLogout} className="text-[var(--color-cream-muted)] text-sm px-2">
              Odjava
            </button>
          </div>
        </div>

        {showDateNav && (
          <>
            <DateNav date={date} onChange={setDate} today={today} />
          </>
        )}

        <div className="flex gap-1.5 mt-4 overflow-x-auto no-scrollbar">
          {visibleTabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-shrink-0 px-3.5 py-2 rounded-full text-xs font-medium transition-all ${
                tab === t.id
                  ? "gold-gradient text-[var(--color-bg)]"
                  : "bg-[var(--color-bg-card)] text-[var(--color-cream-muted)] border border-[var(--color-border)]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <main className="px-5 py-6">
        <div className="mb-5">
          <BarberAppInstall compact />
        </div>

        {tab === "availability" && session?.barberId && <BarberSettings />}

        {tab === "mine" && (
          loading ? <Spinner /> : myBookings.length === 0 ? (
            <EmptyState text="Nema termina za ovaj dan." />
          ) : (
            <BookingList
              bookings={myBookings}
              cancelConfirmId={cancelConfirmId}
              cancellingId={cancellingId}
              onConfirmCancel={setCancelConfirmId}
              onCancel={(id) => cancelBooking(id)}
            />
          )
        )}

        {tab === "team" && isAdmin && (
          loading ? <Spinner /> : Object.keys(teamGroups).length === 0 ? (
            <EmptyState text="Nema rezervacija za ovaj dan." />
          ) : (
            <div className="space-y-6">
              {Object.entries(teamGroups).map(([name, items]) => (
                <div key={name}>
                  <h3 className="font-[family-name:var(--font-display)] font-semibold mb-3 flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: items[0].barber.accentColor }} />
                    {name}
                  </h3>
                  <BookingList
                    bookings={items}
                    cancelConfirmId={cancelConfirmId}
                    cancellingId={cancellingId}
                    onConfirmCancel={setCancelConfirmId}
                    onCancel={(id) => cancelBooking(id, true)}
                    compact
                  />
                </div>
              ))}
            </div>
          )
        )}

        {tab === "services" && isAdmin && (
          <ServicesEditor services={services} onRefresh={loadServices} />
        )}
      </main>
    </div>
  );
}

function DateNav({ date, onChange, today }: { date: string; onChange: (d: string) => void; today: string }) {
  const d = parse(date, "yyyy-MM-dd", new Date());
  return (
    <div>
      <div className="flex items-center justify-between">
        <button onClick={() => onChange(format(subDays(d, 1), "yyyy-MM-dd"))} className="p-2 text-[var(--color-cream-muted)]">←</button>
        <div className="text-center">
          <p className="font-[family-name:var(--font-display)] font-semibold capitalize">
            {format(d, "EEEE", { locale: bs })}
          </p>
          <p className="text-[var(--color-cream-muted)] text-sm">{format(d, "d. MMMM yyyy.", { locale: bs })}</p>
        </div>
        <button onClick={() => onChange(format(addDays(d, 1), "yyyy-MM-dd"))} className="p-2 text-[var(--color-cream-muted)]">→</button>
      </div>
      {date !== today && (
        <button onClick={() => onChange(today)} className="mt-2 w-full text-center text-[var(--color-gold)] text-sm">
          Danas
        </button>
      )}
    </div>
  );
}

function BookingList({
  bookings,
  cancelConfirmId,
  cancellingId,
  onConfirmCancel,
  onCancel,
  compact,
}: {
  bookings: Booking[];
  cancelConfirmId: string | null;
  cancellingId: string | null;
  onConfirmCancel: (id: string | null) => void;
  onCancel: (id: string) => void;
  compact?: boolean;
}) {
  return (
    <div className="space-y-3">
      {!compact && (
        <p className="text-[var(--color-cream-muted)] text-sm mb-2">
          {bookings.length} {bookings.length === 1 ? "termin" : "termina"}
        </p>
      )}
      {bookings.map((b, i) => (
        <div
          key={b.id}
          className="rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border)] p-4 animate-fade-up"
          style={{ animationDelay: `${i * 0.04}s` }}
        >
          <div className="flex items-start gap-4">
            <div className="flex flex-col items-center min-w-[3rem]">
              <span className="font-[family-name:var(--font-display)] text-xl font-bold text-[var(--color-gold)]">{b.startTime}</span>
              <span className="text-[var(--color-cream-muted)] text-xs">{b.endTime}</span>
            </div>
            <div className="flex-1 border-l border-[var(--color-border)] pl-4">
              <p className="font-semibold">{b.customerName}</p>
              <p className="text-[var(--color-cream-muted)] text-sm">{b.service.name}</p>
              <p className="text-[var(--color-gold)] text-sm mt-0.5">{formatPrice(b.service.price)}</p>
              <a href={`tel:${b.customerPhone}`} className="text-xs text-[var(--color-cream-muted)] mt-2 inline-block hover:text-[var(--color-gold)]">
                {b.customerPhone}
              </a>
            </div>
          </div>
          {cancelConfirmId === b.id ? (
            <div className="mt-3 pt-3 border-t border-[var(--color-border)] flex gap-2">
              <button onClick={() => onCancel(b.id)} disabled={cancellingId === b.id} className="flex-1 h-10 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-sm">
                {cancellingId === b.id ? "..." : "Otkaži termin"}
              </button>
              <button onClick={() => onConfirmCancel(null)} className="px-4 h-10 rounded-xl border border-[var(--color-border)] text-sm text-[var(--color-cream-muted)]">
                Ne
              </button>
            </div>
          ) : (
            <button onClick={() => onConfirmCancel(b.id)} className="mt-3 w-full h-9 rounded-xl border border-[var(--color-border)] text-[var(--color-cream-muted)] text-xs hover:text-red-400 hover:border-red-500/30 transition-colors">
              Otkaži termin
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function ServicesEditor({ services, onRefresh }: { services: Service[]; onRefresh: () => void }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: "", price: 0, durationMinutes: 30, description: "" });

  async function save(id?: string) {
    await fetch("/api/admin", {
      method: id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ type: "service", id, ...form, price: Number(form.price), durationMinutes: Number(form.durationMinutes) }),
    });
    setEditing(null);
    setShowNew(false);
    setForm({ name: "", price: 0, durationMinutes: 30, description: "" });
    onRefresh();
  }

  return (
    <div className="space-y-3">
      {services.map((s) => (
        <div key={s.id} className="rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border)] p-4">
          {editing === s.id ? (
            <ServiceForm form={form} setForm={setForm} onSave={() => save(s.id)} onCancel={() => setEditing(null)} />
          ) : (
            <div className="flex justify-between items-center">
              <div>
                <p className="font-semibold">{s.name}</p>
                <p className="text-[var(--color-cream-muted)] text-sm">{s.durationMinutes} min · {formatPrice(s.price)}</p>
              </div>
              <button onClick={() => { setEditing(s.id); setForm({ name: s.name, price: s.price, durationMinutes: s.durationMinutes, description: s.description || "" }); }} className="text-[var(--color-gold)] text-sm">
                Uredi
              </button>
            </div>
          )}
        </div>
      ))}
      {showNew ? (
        <div className="rounded-xl border border-[var(--color-gold)]/30 p-4">
          <ServiceForm form={form} setForm={setForm} onSave={() => save()} onCancel={() => setShowNew(false)} />
        </div>
      ) : (
        <button onClick={() => setShowNew(true)} className="w-full h-11 rounded-xl border border-dashed border-[var(--color-border)] text-[var(--color-cream-muted)] text-sm">
          + Dodaj uslugu
        </button>
      )}
    </div>
  );
}

function ServiceForm({ form, setForm, onSave, onCancel }: {
  form: { name: string; price: number; durationMinutes: number; description: string };
  setForm: (f: typeof form) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-3">
      <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Naziv" className="w-full h-10 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] px-3 text-sm" />
      <div className="flex gap-2">
        <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} placeholder="Cijena" className="flex-1 h-10 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] px-3 text-sm" />
        <input type="number" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })} placeholder="Min" className="w-20 h-10 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] px-3 text-sm" />
      </div>
      <div className="flex gap-2">
        <button onClick={onSave} className="flex-1 h-10 rounded-lg gold-gradient text-[var(--color-bg)] text-sm font-semibold">Sačuvaj</button>
        <button onClick={onCancel} className="px-4 h-10 rounded-lg border border-[var(--color-border)] text-sm text-[var(--color-cream-muted)]">Otkaži</button>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex justify-center py-20">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-gold)] border-t-transparent" />
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="text-center py-20">
      <div className="text-4xl mb-4 opacity-30">✂️</div>
      <p className="text-[var(--color-cream-muted)]">{text}</p>
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from(rawData, (c) => c.charCodeAt(0));
}
