import {
  addDays,
  getDaysDifference,
  getYesterday,
  calculateStreak,
} from '../src/features/calendar/date-utils';

describe('Date Utilities (Slice 0)', () => {
  it('addDays 應正確處理加減天數與跨月跨年', () => {
    expect(addDays('2026-09-01', 6)).toBe('2026-09-07');
    expect(addDays('2026-09-01', 13)).toBe('2026-09-14');
    expect(addDays('2026-09-01', 29)).toBe('2026-09-30');
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-09-01', -1)).toBe('2026-08-31');
  });

  it('getYesterday 應正確取得前一日', () => {
    expect(getYesterday('2026-09-01')).toBe('2026-08-31');
    expect(getYesterday('2026-01-01')).toBe('2025-12-31');
  });

  it('getDaysDifference 應正確計算兩日期間隔', () => {
    expect(getDaysDifference('2026-09-01', '2026-09-07')).toBe(6);
    expect(getDaysDifference('2026-09-07', '2026-09-01')).toBe(-6);
    expect(getDaysDifference('2026-09-01', '2026-09-01')).toBe(0);
  });

  describe('calculateStreak', () => {
    it('今天已完成且連續 3 天完成，連續天數為 4', () => {
      const completed = new Set(['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04']);
      const rest = new Set<string>();
      const streak = calculateStreak({
        completedDates: completed,
        restDates: rest,
        todayKey: '2026-09-04',
        isTodayCompleted: true,
      });
      expect(streak).toBe(4);
    });

    it('今天待完成時，顯示截至昨天的連續天數', () => {
      const completed = new Set(['2026-09-01', '2026-09-02', '2026-09-03']);
      const rest = new Set<string>();
      const streak = calculateStreak({
        completedDates: completed,
        restDates: rest,
        todayKey: '2026-09-04',
        isTodayCompleted: false,
      });
      expect(streak).toBe(3);
    });

    it('昨天為休息日，前天為完成日，今天待完成時連續天數維持 1（休息日不累加但維持連續）', () => {
      const completed = new Set(['2026-09-01']);
      const rest = new Set(['2026-09-02']);
      const streak = calculateStreak({
        completedDates: completed,
        restDates: rest,
        todayKey: '2026-09-03',
        isTodayCompleted: false,
      });
      expect(streak).toBe(1);
    });

    it('昨天為無紀錄日，連續天數中斷歸零', () => {
      const completed = new Set(['2026-09-01']);
      const rest = new Set<string>();
      // 2026-09-02 無紀錄
      const streak = calculateStreak({
        completedDates: completed,
        restDates: rest,
        todayKey: '2026-09-03',
        isTodayCompleted: false,
      });
      expect(streak).toBe(0);
    });

    it('休息日夾在多個完成日之間，不增加天數但保持連續性', () => {
      // 09-01 (C), 09-02 (R), 09-03 (C), 09-04 (C: today)
      const completed = new Set(['2026-09-01', '2026-09-03', '2026-09-04']);
      const rest = new Set(['2026-09-02']);
      const streak = calculateStreak({
        completedDates: completed,
        restDates: rest,
        todayKey: '2026-09-04',
        isTodayCompleted: true,
      });
      expect(streak).toBe(3);
    });
  });
});
