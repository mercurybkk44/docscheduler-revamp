/**
 * Returns the next month and year relative to today.
 * E.g., if today is March 10 2026, returns { month: 3, year: 2026 } (April = index 3).
 */
export function getNextMonth(): { month: number; year: number } {
  const now = new Date();
  const m = now.getMonth(); // 0-indexed
  const y = now.getFullYear();
  if (m === 11) {
    return { month: 0, year: y + 1 };
  }
  return { month: m + 1, year: y };
}

export function getNextMonthPrefix(): string {
  const { month, year } = getNextMonth();
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function getNextMonthLabel(): string {
  const { month, year } = getNextMonth();
  return `${MONTHS[month]} ${year}`;
}

export { MONTHS };
