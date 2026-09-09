import {
  formatLocalDateKey,
  formatMonthDay,
  formatYearMonth,
  getMonthDateRange,
  isSameLocalDate,
} from '../src/features/calendar/date-utils';

describe('日期純函式 (Seam 1)', () => {
  it('格式化當地日期 key 為 YYYY-MM-DD 格式', () => {
    const testDate = new Date(2026, 8, 9); // 2026-09-09
    expect(formatLocalDateKey(testDate)).toBe('2026-09-09');
  });

  it('格式化年月顯示為「YYYY 年 M 月」', () => {
    const testDate = new Date(2026, 8, 9);
    expect(formatYearMonth(testDate)).toBe('2026 年 9 月');
  });

  it('格式化月日顯示為「M 月 D 日」', () => {
    const testDate = new Date(2026, 8, 9);
    expect(formatMonthDay(testDate)).toBe('9 月 9 日');
  });

  it('判斷是否為同一個當地日', () => {
    const d1 = new Date(2026, 8, 9, 8, 30);
    const d2 = new Date(2026, 8, 9, 23, 59);
    const d3 = new Date(2026, 8, 10, 0, 1);
    expect(isSameLocalDate(d1, d2)).toBe(true);
    expect(isSameLocalDate(d1, d3)).toBe(false);
  });

  it('計算月份之起始日與結束日 local_date 範圍', () => {
    const rangeSept = getMonthDateRange(2026, 9);
    expect(rangeSept.startDate).toBe('2026-09-01');
    expect(rangeSept.endDate).toBe('2026-09-30');

    // 閏年二月
    const rangeFebLeap = getMonthDateRange(2024, 2);
    expect(rangeFebLeap.startDate).toBe('2024-02-01');
    expect(rangeFebLeap.endDate).toBe('2024-02-29');

    // 平年二月
    const rangeFebCommon = getMonthDateRange(2026, 2);
    expect(rangeFebCommon.startDate).toBe('2026-02-01');
    expect(rangeFebCommon.endDate).toBe('2026-02-28');
  });
});
