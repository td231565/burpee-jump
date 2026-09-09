import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { MonthCalendar } from '../src/features/calendar/components/month-calendar';

describe('MonthCalendar 元件 (Seam 4)', () => {
  it('顯示星期一開始的星期列表頭與 42 個日期格', () => {
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

    // 42 個按鈕格 (包含補位格)
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(42);

    // 今天 9 日應存在且標記今天
    expect(screen.getByRole('button', { name: '9 日 今天' })).toBeTruthy();
  });
});
