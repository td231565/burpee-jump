import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import DayDetailScreen from '../src/app/day';

const mockBack = jest.fn();
let mockParams = { date: '2026-09-09' };

jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: mockBack,
  }),
  useLocalSearchParams: () => mockParams,
}));

const mockGetFirstAsync = jest.fn();
jest.mock('expo-sqlite', () => ({
  useSQLiteContext: () => ({
    getFirstAsync: (...args: any[]) => mockGetFirstAsync(...args),
  }),
}));

describe('日期詳情 Modal (Slice 3 & Slice 4)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 8, 9, 10, 0, 0)); // 今天 2026-09-09
    mockBack.mockClear();
    mockGetFirstAsync.mockReset();
    mockGetFirstAsync.mockResolvedValue(null);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('今天未完成時，顯示完整年月日與「今日待完成」狀態', async () => {
    mockParams = { date: '2026-09-09' };
    render(<DayDetailScreen />);

    // 顯示完整年月日
    expect(screen.getByText('2026 年 9 月 9 日')).toBeTruthy();

    // 顯示今日待完成
    const statusText = await screen.findByText('今日待完成');
    expect(statusText).toBeTruthy();

    // 點擊關閉按鈕
    const closeButton = screen.getByRole('button', { name: '關閉' });
    fireEvent.press(closeButton);
    expect(mockBack).toHaveBeenCalled();
  });

  it('過去無紀錄日期，顯示「無紀錄」狀態', async () => {
    mockParams = { date: '2026-09-08' };
    render(<DayDetailScreen />);

    expect(screen.getByText('2026 年 9 月 8 日')).toBeTruthy();

    const statusText = await screen.findByText('無紀錄');
    expect(statusText).toBeTruthy();
  });

  it('已有完成紀錄時，顯示「✓ 已完成」與 12 小時制完成時間（標示目前時區）', async () => {
    mockParams = { date: '2026-09-07' };
    mockGetFirstAsync.mockResolvedValue({
      local_date: '2026-09-07',
      completed_at: '2026-09-07T06:30:00.000Z',
    });

    render(<DayDetailScreen />);

    expect(screen.getByText('2026 年 9 月 7 日')).toBeTruthy();

    const completedBadge = await screen.findByText('✓ 已完成');
    expect(completedBadge).toBeTruthy();

    // 完成時間文字包含「目前時區」
    const completedTimeText = await screen.findByText(/目前時區/);
    expect(completedTimeText).toBeTruthy();
  });
});
