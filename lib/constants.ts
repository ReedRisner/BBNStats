export const TEAM = 'Kentucky';
export const START_YEAR = 2015;
export const CURRENT_YEAR = new Date().getFullYear() + 1;
export const SEASONS = Array.from({ length: CURRENT_YEAR - START_YEAR + 1 }, (_, i) => START_YEAR + i).reverse();
