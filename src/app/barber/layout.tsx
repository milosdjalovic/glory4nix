import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "G4N Barber Panel",
  description: "Termini, raspored i dostupnost — Glory 4 Nix",
  manifest: "/manifest-barber.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "G4N Staff",
  },
};

export const viewport: Viewport = {
  themeColor: "#0A0A0A",
};

export default function BarberLayout({ children }: { children: React.ReactNode }) {
  return children;
}
