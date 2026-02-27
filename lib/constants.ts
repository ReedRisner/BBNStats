export const TEAM = 'Kentucky';
export const START_YEAR = 2015;

export function getCurrentSeasonYear(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth();
  return month >= 10 ? year + 1 : year;
}

export const CURRENT_YEAR = getCurrentSeasonYear();
export const SEASONS = Array.from({ length: CURRENT_YEAR - START_YEAR + 1 }, (_, i) => START_YEAR + i).reverse();


export function resolveSeasonYear(year?: string | number | null) {
  const parsed = Number(year);
  if (Number.isInteger(parsed) && SEASONS.includes(parsed)) {
    return parsed;
  }

  return CURRENT_YEAR;
}
