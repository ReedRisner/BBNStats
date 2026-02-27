export const fmtPct = (v?: number) => `${((v || 0) * 100).toFixed(1)}%`;
export const fmt = (v?: number, digits = 1) => (v ?? 0).toFixed(digits);

export function pickSeasonEntry<T extends { season?: number; year?: number; seasonYear?: number }>(entries: T[], year: number) {
  return entries.find((entry) => {
    const entryYear = entry.season ?? entry.year ?? entry.seasonYear;
    return entryYear === year;
  }) ?? entries[0];
}
