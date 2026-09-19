import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import ChallengeScreen from '../src/app/challenge';
import * as challengesRepo from '../src/data/challenges';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: mockBack,
  }),
}));

const mockDb = {
  runAsync: jest.fn(),
  getFirstAsync: jest.fn(),
  getAllAsync: jest.fn(),
};

jest.mock('expo-sqlite', () => ({
  useSQLiteContext: () => mockDb,
}));

describe('ChallengeScreen (Slice 1)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 8, 1, 10, 0, 0)); // 2026-09-01
    mockBack.mockClear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('渲染 7、14、30 天選項與不能中途取消之提示', () => {
    render(<ChallengeScreen />);

    expect(screen.getAllByText('開始挑戰').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('選擇挑戰週期')).toBeTruthy();
    expect(screen.getByText('7 天')).toBeTruthy();
    expect(screen.getByText('14 天')).toBeTruthy();
    expect(screen.getByText('30 天')).toBeTruthy();
    expect(screen.getByText('挑戰開始後，不能中途取消')).toBeTruthy();
  });

  it('切換週期時正確更新預計起迄日與休息額度', () => {
    render(<ChallengeScreen />);

    // 預設 7 天
    expect(screen.getByText('2026 年 9 月 1 日 至 2026 年 9 月 7 日')).toBeTruthy();
    expect(screen.getByText('1 次')).toBeTruthy();

    // 切換至 14 天
    fireEvent.press(screen.getByText('14 天'));
    expect(screen.getByText('2026 年 9 月 1 日 至 2026 年 9 月 14 日')).toBeTruthy();
    expect(screen.getByText('2 次')).toBeTruthy();

    // 切換至 30 天
    fireEvent.press(screen.getByText('30 天'));
    expect(screen.getByText('2026 年 9 月 1 日 至 2026 年 9 月 30 日')).toBeTruthy();
    expect(screen.getByText('3 次')).toBeTruthy();
  });

  it('點擊開始挑戰直接建立並返回首頁', async () => {
    const createSpy = jest.spyOn(challengesRepo, 'createChallenge').mockResolvedValue({
      id: 1,
      start_date: '2026-09-01',
      duration_days: 7,
      rest_quota: 1,
      settled_at: null,
    });

    render(<ChallengeScreen />);

    const submitBtn = screen.getByRole('button', { name: '開始挑戰' });
    fireEvent.press(submitBtn);

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith(mockDb, '2026-09-01', 7);
      expect(mockBack).toHaveBeenCalled();
    });
  });

  it('跨午夜防呆：點擊時若當地日已變更，該次僅刷新預覽不建立，再次點擊才建立', async () => {
    const createSpy = jest.spyOn(challengesRepo, 'createChallenge').mockResolvedValue({
      id: 2,
      start_date: '2026-09-02',
      duration_days: 7,
      rest_quota: 1,
      settled_at: null,
    });

    render(<ChallengeScreen />);

    // 模擬使用者在畫面停留時跨過午夜
    jest.setSystemTime(new Date(2026, 8, 2, 0, 5, 0)); // 2026-09-02

    const submitBtn = screen.getByRole('button', { name: '開始挑戰' });

    // 第一次點擊：僅刷新預覽，不建立
    fireEvent.press(submitBtn);
    expect(createSpy).not.toHaveBeenCalled();
    expect(mockBack).not.toHaveBeenCalled();

    // 預覽已更新為 09-02 開始
    expect(screen.getByText('2026 年 9 月 2 日 至 2026 年 9 月 8 日')).toBeTruthy();

    // 第二次點擊：正式建立
    fireEvent.press(submitBtn);
    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith(mockDb, '2026-09-02', 7);
      expect(mockBack).toHaveBeenCalled();
    });
  });
});
