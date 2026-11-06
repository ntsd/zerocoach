import { getTranslations } from '@/i18n';
import { useCoachStore } from '@/store/useCoachStore';
import { AppLanguage } from '@/types/coach';

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

export function formatDateDisplay(
  dateStr: string,
  language?: AppLanguage | string,
  t?: ReturnType<typeof getTranslations>
): string {
  const activeLang = (language as AppLanguage) || useCoachStore.getState().language || 'en';
  const translations = t || getTranslations(activeLang);

  const todayStr = getTodayString();
  if (dateStr === todayStr) return translations.common.todayDisplay;

  const d = new Date();
  d.setDate(d.getDate() - 1);
  const yesterdayStr = getLocalDateString(d);
  if (dateStr === yesterdayStr) return translations.common.yesterdayDisplay;

  const tmr = new Date();
  tmr.setDate(tmr.getDate() + 1);
  const tomorrowStr = getLocalDateString(tmr);
  if (dateStr === tomorrowStr) return translations.common.tomorrowDisplay;

  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString(activeLang === 'th' ? 'th-TH' : 'en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}


