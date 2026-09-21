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
    expect(screen.getByRole('button', { name: '返回日曆' })).toBeTruthy();
  });

  it('點擊返回日曆按鈕返回日曆', () => {
    render(<ChallengeScreen />);
    const backBtn = screen.getByRole('button', { name: '返回日曆' });
    fireEvent.press(backBtn);
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('選取不同週期時以對應天數建立挑戰', async () => {
    const createSpy = jest.spyOn(challengesRepo, 'createChallenge').mockResolvedValue({
      id: 1,
      start_date: '2026-09-01',
      duration_days: 14,
      rest_quota: 2,
      settled_at: null,
    });

    render(<ChallengeScreen />);

    fireEvent.press(screen.getByText('14 天'));

    const submitBtn = screen.getByRole('button', { name: '開始挑戰' });
    fireEvent.press(submitBtn);

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith(mockDb, '2026-09-01', 14);
      expect(mockBack).toHaveBeenCalled();
    });
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

  it('跨午夜後點擊開始挑戰以當下當地日建立', async () => {
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
    fireEvent.press(submitBtn);

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith(mockDb, '2026-09-02', 7);
      expect(mockBack).toHaveBeenCalled();
    });
  });
});
