import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  formatDateDisplay,
  getTodayString,
  getLocalDateString,
} from '../date';
import { useCoachStore } from '@/store/useCoachStore';
import { getTranslations } from '@/i18n';

describe('formatDateDisplay i18n & relative dates', () => {
  it('formats today using i18n dictionary for English and Thai', () => {
    const todayStr = getTodayString();
    const enTrans = getTranslations('en');
    const thTrans = getTranslations('th');

    assert.strictEqual(
      formatDateDisplay(todayStr, 'en'),
      enTrans.common.todayDisplay,
      'English today display'
    );
    assert.strictEqual(
      formatDateDisplay(todayStr, 'th'),
      thTrans.common.todayDisplay,
      'Thai today display'
    );
  });

  it('formats yesterday and tomorrow using i18n dictionary', () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const yesterdayStr = getLocalDateString(d);

    const tmr = new Date();
    tmr.setDate(tmr.getDate() + 1);
    const tomorrowStr = getLocalDateString(tmr);

    assert.strictEqual(formatDateDisplay(yesterdayStr, 'en'), 'Yesterday');
    assert.strictEqual(formatDateDisplay(yesterdayStr, 'th'), 'เมื่อวาน');
    assert.strictEqual(formatDateDisplay(tomorrowStr, 'en'), 'Tomorrow');
    assert.strictEqual(formatDateDisplay(tomorrowStr, 'th'), 'พรุ่งนี้');
  });

  it('falls back to useCoachStore language when omitted', () => {
    const todayStr = getTodayString();
    useCoachStore.getState().setLanguage('th');
    assert.strictEqual(formatDateDisplay(todayStr), 'วันนี้');

    useCoachStore.getState().setLanguage('en');
    assert.strictEqual(formatDateDisplay(todayStr), 'Today');
  });

  it('formats historical date with locale', () => {
    const formattedEn = formatDateDisplay('2024-01-15', 'en');
    const formattedTh = formatDateDisplay('2024-01-15', 'th');

    assert.ok(formattedEn.includes('Jan') || formattedEn.includes('15'));
    assert.ok(formattedTh.length > 0);
  });
});

