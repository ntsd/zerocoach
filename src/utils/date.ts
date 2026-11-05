/**
 * Canonical date formatting utility for local calendar dates (YYYY-MM-DD).
 *
 * IMPORTANT:
 * Never use `Date.prototype.toISOString().split('T')[0]` for calendar dates!
 * `toISOString()` converts to UTC, which rolls backward to yesterday for any
 * timezone east of UTC (e.g. UTC+7 Thailand/Vietnam/Indonesia) between midnight
 * and morning (00:00 - 06:59).
 */

export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTodayString(): string {
  return getLocalDateString(new Date());
}

