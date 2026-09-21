import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { MonthCalendar } from '../src/features/calendar/components/month-calendar';

describe('MonthCalendar 元件 (Seam 4)', () => {
  it('顯示星期一開始的星期列表頭與最少完整週 35 個日期格 (2026 年 9 月)', () => {
    const today = new Date(2026, 8, 9); // 2026-09-09
    render(
      <MonthCalendar
        year={2026}
        month={9}
        today={today}
      />
    );

    // 星期列表頭：一 到 日
    const weekHeaders = ['一', '二', '三', '四', '五', '六', '日'];
    weekHeaders.forEach((dayName) => {
      expect(screen.getByText(dayName)).toBeTruthy();
    });

    // 35 個按鈕格 (5 週最少完整週)
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(35);

    // 今天 9 日應存在且標記今天
    expect(screen.getByRole('button', { name: '9 日 今天' })).toBeTruthy();
  });

  it('支援 28 格月份 (2021 年 2 月，4 週)', () => {
    const today = new Date(2021, 1, 10);
    render(
      <MonthCalendar
        year={2021}
        month={2}
        today={today}
      />
    );

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(28);
  });

  it('支援 42 格月份 (2026 年 8 月，6 週)', () => {
    const today = new Date(2026, 7, 15);
    render(
      <MonthCalendar
        year={2026}
        month={8}
        today={today}
      />
    );

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(42);
  });

  it('在 320dp 窄螢幕下維持七列表頭與完整日期格', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const RN = require('react-native');
    jest.spyOn(RN, 'useWindowDimensions').mockReturnValue({
      width: 320,
      height: 640,
      scale: 1,
      fontScale: 1,
    });

    render(
      <MonthCalendar
        year={2026}
        month={9}
        today={new Date(2026, 8, 9)}
      />
    );

    const weekHeaders = ['一', '二', '三', '四', '五', '六', '日'];
    weekHeaders.forEach((dayName) => {
      expect(screen.getByText(dayName)).toBeTruthy();
    });

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(35);
  });
});
