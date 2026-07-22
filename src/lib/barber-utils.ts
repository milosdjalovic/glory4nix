const BARBER_ORDER = ["nix", "seki", "ivan"];

export function sortBarbers<T extends { slug: string; name: string }>(barbers: T[]): T[] {
  return [...barbers].sort((a, b) => {
    const aIndex = BARBER_ORDER.indexOf(a.slug);
    const bIndex = BARBER_ORDER.indexOf(b.slug);
    const aRank = aIndex === -1 ? BARBER_ORDER.length : aIndex;
    const bRank = bIndex === -1 ? BARBER_ORDER.length : bIndex;
    if (aRank !== bRank) return aRank - bRank;
    return a.name.localeCompare(b.name, "bs");
  });
}
