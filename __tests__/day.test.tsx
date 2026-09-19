import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import DayDetailScreen from '../src/app/day';
import * as restDaysRepo from '../src/data/rest-days';

const mockBack = jest.fn();
let mockParams = { date: '2026-09-09' };

jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: mockBack,
  }),
  useLocalSearchParams: () => mockParams,
}));

let mockCompletion: any = null;
let mockRestDay: any = null;
let mockChallenge: any = null;
let mockRestCount = 0;

const mockDb = {
  getFirstAsync: jest.fn(async (sql: string) => {
    if (sql.includes('daily_completions')) {
      return mockCompletion;
    }
    if (sql.includes('rest_days') && sql.includes('COUNT')) {
      return { count: mockRestCount };
    }
    if (sql.includes('rest_days')) {
      return mockRestDay;
    }
    if (sql.includes('challenges')) {
      return mockChallenge;
    }
    return null;
  }),
  getAllAsync: jest.fn(async () => []),
  runAsync: jest.fn(async () => ({ lastInsertRowId: 1, changes: 1 })),
};

jest.mock('expo-sqlite', () => ({
  useSQLiteContext: () => mockDb,
}));

describe('日期詳情 Modal (Slice 3 & Slice 4)', () => {
  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ['setInterval', 'setTimeout'] });
    jest.setSystemTime(new Date(2026, 8, 9, 10, 0, 0)); // 今天 2026-09-09
    mockBack.mockClear();
    mockCompletion = null;
    mockRestDay = null;
    mockChallenge = null;
    mockRestCount = 0;
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('今天未完成時，顯示完整年月日與「今日待完成」狀態', async () => {
    mockParams = { date: '2026-09-09' };
    render(<DayDetailScreen />);

    expect(screen.getByText('2026 年 9 月 9 日')).toBeTruthy();

    const statusText = await screen.findByText('今日待完成');
    expect(statusText).toBeTruthy();

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
    mockCompletion = {
      local_date: '2026-09-07',
      completed_at: '2026-09-07T06:30:00.000Z',
    };

    render(<DayDetailScreen />);

    expect(screen.getByText('2026 年 9 月 7 日')).toBeTruthy();

    const completedText = await screen.findByText('✓ 已完成');
    expect(completedText).toBeTruthy();

    const timeText = await screen.findByText(/目前時區/);
    expect(timeText).toBeTruthy();
  });

  it('已設為休息日且在取消期限內，顯示「休 休息日」與取消休息按鈕', async () => {
    mockParams = { date: '2026-09-09' };
    mockRestDay = {
      local_date: '2026-09-09',
      challenge_id: 1,
      created_at: '2026-09-09T08:00:00.000Z',
    };

    const cancelSpy = jest.spyOn(restDaysRepo, 'cancelRestDay').mockResolvedValue();

    render(<DayDetailScreen />);

    const restText = await screen.findByText('休 休息日');
    expect(restText).toBeTruthy();

    const cancelBtn = screen.getByRole('button', { name: '取消休息' });
    expect(cancelBtn).toBeTruthy();

    fireEvent.press(cancelBtn);
    await waitFor(() => {
      expect(cancelSpy).toHaveBeenCalledWith(mockDb, '2026-09-09');
    });
  });

  it('昨天無紀錄且原挑戰尚有額度時，顯示「將昨天設為休息日」並彈出確認對話框', async () => {
    mockParams = { date: '2026-09-08' }; // 昨天 (今天是 2026-09-09)
    mockChallenge = {
      id: 1,
      start_date: '2026-09-05',
      duration_days: 7,
      rest_quota: 1,
      settled_at: null,
    };
    mockRestCount = 0; // 尚有 1 次額度

    const setRestSpy = jest.spyOn(restDaysRepo, 'setRestDay').mockResolvedValue();

    render(<DayDetailScreen />);

    const makeupBtn = await screen.findByRole('button', { name: '將昨天設為休息日' });
    expect(makeupBtn).toBeTruthy();

    fireEvent.press(makeupBtn);

    // 確認對話框彈出
    expect(screen.getByText('將昨天設為休息日？')).toBeTruthy();
    expect(screen.getByText('這將消耗 1 次休息額度，挑戰結束日保持不變。')).toBeTruthy();

    // 點擊確認登記
    const confirmBtn = screen.getByRole('button', { name: '確認登記' });
    fireEvent.press(confirmBtn);

    await waitFor(() => {
      expect(setRestSpy).toHaveBeenCalledWith(
        mockDb,
        '2026-09-08',
        1,
        expect.any(String)
      );
    });
  });
});
