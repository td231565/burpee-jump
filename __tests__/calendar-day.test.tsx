import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { CalendarDay } from '../src/features/calendar/components/calendar-day';

describe('CalendarDay 元件 (Seam 4)', () => {
  it('今天未完成時，顯示今天樣式且可點擊', () => {
    const onPress = jest.fn();
    render(
      <CalendarDay
        localDate="2026-09-09"
        day={9}
        isCurrentMonth={true}
        isToday={true}
        isPast={false}
        isFuture={false}
        isCompleted={false}
        onPress={onPress}
      />
    );

    const button = screen.getByRole('button', { name: '9 日 今天' });
    expect(button).toBeTruthy();
    expect(button.props.accessibilityState?.disabled).toBeFalsy();

    fireEvent.press(button);
    expect(onPress).toHaveBeenCalledWith('2026-09-09');
  });

  it('過去無紀錄日期可點擊', () => {
    const onPress = jest.fn();
    render(
      <CalendarDay
        localDate="2026-09-08"
        day={8}
        isCurrentMonth={true}
        isToday={false}
        isPast={true}
        isFuture={false}
        isCompleted={false}
        onPress={onPress}
      />
    );

    const button = screen.getByRole('button', { name: '8 日' });
    expect(button).toBeTruthy();
    expect(button.props.accessibilityState?.disabled).toBeFalsy();

    fireEvent.press(button);
    expect(onPress).toHaveBeenCalledWith('2026-09-08');
  });

  it('本月未來日期不可點擊', () => {
    const onPress = jest.fn();
    render(
      <CalendarDay
        localDate="2026-09-10"
        day={10}
        isCurrentMonth={true}
        isToday={false}
        isPast={false}
        isFuture={true}
        isCompleted={false}
        onPress={onPress}
      />
    );

    const button = screen.getByRole('button', { name: '10 日' });
    expect(button.props.accessibilityState?.disabled).toBe(true);

    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('非本月補位日期降低對比且不可點擊', () => {
    const onPress = jest.fn();
    render(
      <CalendarDay
        localDate="2026-08-31"
        day={31}
        isCurrentMonth={false}
        isToday={false}
        isPast={true}
        isFuture={false}
        isCompleted={false}
        onPress={onPress}
      />
    );

    const button = screen.getByRole('button', { name: '31 日 非本月' });
    expect(button.props.accessibilityState?.disabled).toBe(true);

    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });
});
