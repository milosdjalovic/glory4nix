"use client";

import { useState } from "react";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import IosInstallGuide from "@/components/IosInstallGuide";

interface BarberAppInstallProps {
  compact?: boolean;
}

export default function BarberAppInstall({ compact }: BarberAppInstallProps) {
  const [showAndroidInstall, setShowAndroidInstall] = useState(false);
  const [installing, setInstalling] = useState(false);
  const { canInstall, isIosDevice, isAndroidDevice, hasNativePrompt, install } = usePwaInstall();

  const installUrl =
    typeof window !== "undefined" ? `${window.location.origin}/barber` : "/barber";

  if (!canInstall) return null;

  async function handleInstall() {
    if (isIosDevice) return;

    if (!hasNativePrompt && isAndroidDevice) {
      setShowAndroidInstall((v) => !v);
      return;
    }

    setInstalling(true);
    await install();
    setInstalling(false);
  }

  if (compact) {
    return (
      <div className="rounded-xl border border-[var(--color-gold)]/20 bg-[var(--color-bg-card)] p-3">
        <p className="text-xs font-medium text-[var(--color-cream)]">Instaliraj barber app</p>
        <p className="text-[11px] text-[var(--color-cream-muted)] mt-1">
          Otvara panel direktno — bez Google pretrage.
        </p>
        {isIosDevice ? (
          <IosInstallGuide installUrl={installUrl} />
        ) : (
          <>
            <button
              type="button"
              onClick={handleInstall}
              disabled={installing}
              className="mt-2 w-full rounded-lg gold-gradient py-2 text-xs font-semibold text-[var(--color-bg)]"
            >
              {installing ? "Instaliranje..." : showAndroidInstall ? "Sakrij upute" : "Instaliraj"}
            </button>
            {showAndroidInstall && !hasNativePrompt && <AndroidSteps />}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-2xl border border-[var(--color-gold)]/20 bg-[var(--color-bg-card)] p-4">
      <p className="font-[family-name:var(--font-display)] font-semibold text-sm">
        Instaliraj barber app
      </p>
      <p className="text-[var(--color-cream-muted)] text-xs mt-1 leading-relaxed">
        Dodaj na početni ekran — otvara panel direktno, prijava ostaje zapamćena.
      </p>

      {isIosDevice ? (
        <IosInstallGuide installUrl={installUrl} />
      ) : (
        <>
          <button
            type="button"
            onClick={handleInstall}
            disabled={installing}
            className="mt-3 w-full rounded-xl gold-gradient py-3 text-sm font-semibold text-[var(--color-bg)]"
          >
            {installing ? "Instaliranje..." : showAndroidInstall ? "Sakrij upute" : "Instaliraj aplikaciju"}
          </button>
          {showAndroidInstall && !hasNativePrompt && <AndroidSteps />}
        </>
      )}
    </div>
  );
}

function AndroidSteps() {
  return (
    <div className="mt-3 rounded-xl bg-[var(--color-bg)]/60 border border-[var(--color-border)] px-3 py-3 text-xs text-[var(--color-cream-muted)] leading-relaxed">
      <ol className="space-y-1.5 list-decimal list-inside">
        <li>Dodirni meni <strong className="text-[var(--color-cream)]">⋮</strong> u browseru</li>
        <li>Odaberi <strong className="text-[var(--color-cream)]">Instaliraj aplikaciju</strong></li>
        <li>Potvrdi — app otvara barber panel</li>
      </ol>
    </div>
  );
}
