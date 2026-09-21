import {
  formatLocalDateKey,
  formatMonthDay,
  formatYearMonth,
  formatDetailDate,
  formatCompletedDateTime,
  getMonthDateRange,
  isSameLocalDate,
  generateMonthGrid,
  getPreviousMonth,
  getNextMonth,
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

  it('格式化年月日字串為「YYYY 年 M 月 D 日」', () => {
    expect(formatDetailDate('2026-09-09')).toBe('2026 年 9 月 9 日');
    expect(formatDetailDate('2024-02-29')).toBe('2024 年 2 月 29 日');
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

  describe('generateMonthGrid (Seam 1)', () => {
    it('依月份採最少完整週契約產生 35 格 (2026 年 9 月，5 週)', () => {
      const today = new Date(2026, 8, 9); // 2026-09-09
      const grid = generateMonthGrid(2026, 9, today);

      expect(grid).toHaveLength(35);

      // 9 月 1 日為週二，第 1 格為 8 月 31 日 (週一，非本月補位)
      expect(grid[0]).toEqual({
        localDate: '2026-08-31',
        day: 31,
        isCurrentMonth: false,
        isToday: false,
        isPast: true,
        isFuture: false,
      });

      // 第 2 格為 9 月 1 日 (本月第一天)
      expect(grid[1]).toEqual({
        localDate: '2026-09-01',
        day: 1,
        isCurrentMonth: true,
        isToday: false,
        isPast: true,
        isFuture: false,
      });

      // 9 月 9 日 (今天)
      const todayCell = grid.find((cell) => cell.localDate === '2026-09-09');
      expect(todayCell).toEqual({
        localDate: '2026-09-09',
        day: 9,
        isCurrentMonth: true,
        isToday: true,
        isPast: false,
        isFuture: false,
      });

      // 9 月 10 日 (未來)
      const futureCell = grid.find((cell) => cell.localDate === '2026-09-10');
      expect(futureCell?.isFuture).toBe(true);
      expect(futureCell?.isPast).toBe(false);

      // 最後一格 (第 35 格) 為 10 月 4 日 (非本月補位，週日)
      expect(grid[34]).toEqual({
        localDate: '2026-10-04',
        day: 4,
        isCurrentMonth: false,
        isToday: false,
        isPast: false,
        isFuture: true,
      });
    });

    it('產生 28 格的最少完整週 (2021 年 2 月，平年且 1 號為週一，剛好 4 週)', () => {
      const today = new Date(2021, 1, 10);
      const grid = generateMonthGrid(2021, 2, today);
      expect(grid).toHaveLength(28);
      expect(grid[0].localDate).toBe('2021-02-01');
      expect(grid[0].isCurrentMonth).toBe(true);
      expect(grid[27].localDate).toBe('2021-02-28');
      expect(grid[27].isCurrentMonth).toBe(true);
    });

    it('產生 42 格的最少完整週 (2026 年 8 月，1 號為週六且有 31 天，需 6 週)', () => {
      const today = new Date(2026, 7, 15);
      const grid = generateMonthGrid(2026, 8, today);
      expect(grid).toHaveLength(42);
      expect(grid[0].localDate).toBe('2026-07-27'); // 補位週一
      expect(grid[0].isCurrentMonth).toBe(false);
      expect(grid[5].localDate).toBe('2026-08-01'); // 本月第一天週六
      expect(grid[5].isCurrentMonth).toBe(true);
      expect(grid[35].localDate).toBe('2026-08-31'); // 本月最後一天週一
      expect(grid[35].isCurrentMonth).toBe(true);
      expect(grid[41].localDate).toBe('2026-09-06'); // 補位週日
      expect(grid[41].isCurrentMonth).toBe(false);
    });

    it('1 號為週一但有 30 天的情形 (2026 年 6 月，產生 35 格)', () => {
      const today = new Date(2026, 5, 15);
      const grid = generateMonthGrid(2026, 6, today);
      expect(grid).toHaveLength(35);
      expect(grid[0].localDate).toBe('2026-06-01');
      expect(grid[0].isCurrentMonth).toBe(true);
      expect(grid[29].localDate).toBe('2026-06-30');
      expect(grid[29].isCurrentMonth).toBe(true);
      expect(grid[34].localDate).toBe('2026-07-05');
      expect(grid[34].isCurrentMonth).toBe(false);
    });

    it('1 號為週日的情形 (2026 年 11 月，前面需補 6 天，產生 42 格)', () => {
      const today = new Date(2026, 10, 15);
      const grid = generateMonthGrid(2026, 11, today);
      expect(grid).toHaveLength(42);
      expect(grid[0].localDate).toBe('2026-10-26'); // 週一
      expect(grid[5].localDate).toBe('2026-10-31'); // 週六
      expect(grid[6].localDate).toBe('2026-11-01'); // 週日
      expect(grid[6].isCurrentMonth).toBe(true);
    });

    it('閏年二月 (2024 年 2 月，29 天，產生 35 格)', () => {
      const today = new Date(2024, 1, 10);
      const grid = generateMonthGrid(2024, 2, today);
      expect(grid).toHaveLength(35);
      const feb29 = grid.find((cell) => cell.localDate === '2024-02-29');
      expect(feb29).toBeDefined();
      expect(feb29?.isCurrentMonth).toBe(true);
    });
  });

  describe('月份前後切換純函式 (Seam 1)', () => {
    it('正常切換上一月與下一月', () => {
      expect(getPreviousMonth(2026, 9)).toEqual({ year: 2026, month: 8 });
      expect(getNextMonth(2026, 9)).toEqual({ year: 2026, month: 10 });
    });

    it('跨年切換：1 月切上一月為前一年 12 月；12 月切下一月為次年 1 月', () => {
      expect(getPreviousMonth(2026, 1)).toEqual({ year: 2025, month: 12 });
      expect(getNextMonth(2026, 12)).toEqual({ year: 2027, month: 1 });
    });
  });

  describe('formatCompletedDateTime 純函式 (Seam 1)', () => {
    it('以 zh-TW 12 小時制格式化 UTC 時間並標示「目前時區」', () => {
      // 06:30 UTC 轉 Asia/Taipei 為 14:30 (下午 2:30)
      const formattedAfternoon = formatCompletedDateTime(
        '2026-09-09T06:30:00.000Z',
        'Asia/Taipei'
      );
      expect(formattedAfternoon).toBe('2026 年 9 月 9 日 下午 2:30（目前時區）');

      // 01:05 UTC 轉 Asia/Taipei 為 09:05 (上午 9:05)
      const formattedMorning = formatCompletedDateTime(
        '2026-09-09T01:05:00.000Z',
        'Asia/Taipei'
      );
      expect(formattedMorning).toBe('2026 年 9 月 9 日 上午 9:05（目前時區）');
    });
  });
});


