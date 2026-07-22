"use client";

import { useState } from "react";
import { detectIosBrowser } from "@/lib/ios-browser";

interface IosInstallGuideProps {
  installUrl?: string;
}

export default function IosInstallGuide({ installUrl }: IosInstallGuideProps) {
  const [copied, setCopied] = useState(false);
  const browser = detectIosBrowser();

  async function copyLink() {
    const url = installUrl ?? (typeof window !== "undefined" ? window.location.origin : "");
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="mt-3 space-y-3 animate-fade-in">
      {(browser === "chrome" || browser === "firefox" || browser === "in-app" || browser === "other") && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-3 text-xs leading-relaxed">
          <p className="font-medium text-amber-200/90 mb-1">Prvo otvorite u Safariju</p>
          <p className="text-[var(--color-cream-muted)]">
            Na iPhoneu prečica radi samo iz <strong className="text-[var(--color-cream)]">Safarija</strong>, ne iz Chromea ili Instagrama.
          </p>
          <button
            type="button"
            onClick={copyLink}
            className="mt-2 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-xs font-medium text-[var(--color-cream)]"
          >
            {copied ? "Link kopiran ✓" : "Kopiraj link → zalijepi u Safari"}
          </button>
        </div>
      )}

      {browser === "safari" && <SafariSteps />}

      {browser === "chrome" && (
        <div className="rounded-xl bg-[var(--color-bg)]/60 border border-[var(--color-border)] px-3 py-3 text-xs text-[var(--color-cream-muted)] leading-relaxed">
          <p className="font-medium text-[var(--color-cream)] mb-2">Ili u Chromeu:</p>
          <ol className="space-y-2 list-decimal list-inside">
            <li>Dodirni <strong className="text-[var(--color-cream)]">⋯</strong> gore desno</li>
            <li>Odaberi <strong className="text-[var(--color-cream)]">Dijeli</strong></li>
            <li>Skroluj dolje → <strong className="text-[var(--color-cream)]">Dodaj na početni ekran</strong></li>
          </ol>
        </div>
      )}

      {(browser === "firefox" || browser === "other" || browser === "in-app") && (
        <SafariSteps title="U Safariju:" />
      )}
    </div>
  );
}

function SafariSteps({ title = "Safari — korak po korak:" }: { title?: string }) {
  const steps = [
    {
      label: "Dodirni Dijeli",
      detail: "Ikona na dnu ekrana — kvadrat sa strelicom prema gore ↑",
    },
    {
      label: "Skroluj listu prema dolje",
      detail: "Opcija nije odmah vidljiva — moraš malo skrolati!",
    },
    {
      label: "Dodaj na početni ekran",
      detail: 'Traži red sa plusom ➕ (može pisati i "Add to Home Screen")',
    },
    {
      label: 'Dodirni "Dodaj"',
      detail: "Gore desno u uglu ekrana",
    },
  ];

  return (
    <div className="rounded-xl bg-[var(--color-bg)]/60 border border-[var(--color-border)] px-3 py-3">
      <p className="font-medium text-[var(--color-cream)] text-xs mb-3">{title}</p>
      <ol className="space-y-3">
        {steps.map((step, i) => (
          <li key={step.label} className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-gold)]/15 text-[10px] font-bold text-[var(--color-gold)]">
              {i + 1}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium text-[var(--color-cream)]">{step.label}</p>
              <p className="text-[11px] text-[var(--color-cream-muted)] mt-0.5 leading-relaxed">
                {step.detail}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
