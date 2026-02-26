export const fmtPct = (v?: number) => `${((v || 0) * 100).toFixed(1)}%`;
export const fmt = (v?: number, digits = 1) => (v ?? 0).toFixed(digits);
