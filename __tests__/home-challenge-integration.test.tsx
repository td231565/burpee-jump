import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import HomeScreen from '../src/app/index';
import * as challengesData from '../src/data/challenges';
import * as restDaysData from '../src/data/rest-days';
import * as completionsData from '../src/data/completions';

const mockPush = jest.fn();
let mockSearchParams: Record<string, string> = {};

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => mockSearchParams,
  useFocusEffect: (cb: any) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useEffect } = require('react');
    useEffect(() => {
      return cb();
    }, [cb]);
  },
}));

const mockDb = {
  getFirstAsync: jest.fn().mockImplementation((sql: string) => {
    if (sql.includes('audio_preferences')) {
      return Promise.resolve({
        id: 1,
        voice_enabled: 1,
        cues_enabled: 1,
        music_enabled: 1,
      });
    }
    return Promise.resolve(null);
  }),
  getAllAsync: jest.fn().mockResolvedValue([]),
  runAsync: jest.fn().mockResolvedValue({ lastInsertRowId: 1, changes: 1 }),
  execAsync: jest.fn().mockResolvedValue(undefined),
};

jest.mock('expo-sqlite', () => ({
  useSQLiteContext: () => mockDb,
  SQLiteProvider: ({ children }: any) => children,
}));

jest.mock('../src/data/onboarding', () => ({
  hasPresentedOnboarding: jest.fn().mockResolvedValue(true),
  markOnboardingPresented: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../src/data/profile', () => ({
  getUserProfile: jest.fn().mockResolvedValue({ nickname: null }),
  setUserNickname: jest.fn().mockResolvedValue(undefined),
}));

describe('HomeScreen Phase 2 挑戰週期與休息日整合', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams = {};
    jest.spyOn(completionsData, 'getCompletionsForMonth').mockResolvedValue([]);
    jest.spyOn(completionsData, 'getCompletionByDate').mockResolvedValue(null);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('無活躍挑戰時顯示「開始挑戰」按鈕，點擊導航至挑戰建立頁面', async () => {
    jest.spyOn(challengesData, 'getActiveChallenge').mockResolvedValue(null);
    jest.spyOn(challengesData, 'getUnsettledEndedChallenge').mockResolvedValue(null);
    jest.spyOn(restDaysData, 'getRestDaysForRange').mockResolvedValue([]);
    jest.spyOn(restDaysData, 'getRestDayByDate').mockResolvedValue(null);

    render(<HomeScreen />);

    const createBtn = await screen.findByRole('button', { name: '開始挑戰' });
    expect(createBtn).toBeTruthy();

    fireEvent.press(createBtn);
    expect(mockPush).toHaveBeenCalledWith('/challenge');
  });

  it('有活躍挑戰時顯示挑戰摘要橫幅（天數與剩餘休息）', async () => {
    const mockChallenge: challengesData.Challenge = {
      id: 1,
      start_date: '2026-09-15',
      duration_days: 7,
      rest_quota: 1,
      settled_at: null,
    };
    jest.spyOn(challengesData, 'getActiveChallenge').mockResolvedValue(mockChallenge);
    jest.spyOn(challengesData, 'getUnsettledEndedChallenge').mockResolvedValue(null);
    jest.spyOn(challengesData, 'getChallengeSummary').mockResolvedValue({
      challenge: mockChallenge,
      startDate: '2026-09-15',
      endDate: '2026-09-21',
      remainingDays: 4,
      remainingRestQuota: 1,
      isEnded: false,
      isSettled: false,
    });
    jest.spyOn(restDaysData, 'getRestDaysForRange').mockResolvedValue([]);
    jest.spyOn(restDaysData, 'getRestDayByDate').mockResolvedValue(null);

    render(<HomeScreen />);

    expect(await screen.findByText(/挑戰還有 4 天，剩餘休息 1 天/)).toBeTruthy();
  });

  it('今日尚未完成且有剩餘額度時，可點擊「把今天設為休息日」，並直接更新為「取消休息」', async () => {
    const mockChallenge: challengesData.Challenge = {
      id: 1,
      start_date: '2026-09-15',
      duration_days: 7,
      rest_quota: 1,
      settled_at: null,
    };
    jest.spyOn(challengesData, 'getActiveChallenge').mockResolvedValue(mockChallenge);
    jest.spyOn(challengesData, 'getUnsettledEndedChallenge').mockResolvedValue(null);
    const summarySpy = jest.spyOn(challengesData, 'getChallengeSummary');
    summarySpy.mockResolvedValue({
      challenge: mockChallenge,
      startDate: '2026-09-15',
      endDate: '2026-09-21',
      remainingDays: 4,
      remainingRestQuota: 1,
      isEnded: false,
      isSettled: false,
    });

    const setRestDaySpy = jest.spyOn(restDaysData, 'setRestDay').mockResolvedValue(undefined);
    const cancelRestDaySpy = jest.spyOn(restDaysData, 'cancelRestDay').mockResolvedValue(undefined);
    jest.spyOn(restDaysData, 'getRestDaysForRange').mockResolvedValue([]);
    const getRestDaySpy = jest.spyOn(restDaysData, 'getRestDayByDate').mockResolvedValue(null);

    render(<HomeScreen />);

    const restBtn = await screen.findByRole('button', { name: '把今天設為休息日' });
    expect(restBtn).toBeTruthy();

    // 模擬設為休息後之資料庫回傳
    getRestDaySpy.mockResolvedValue({
      local_date: '2026-09-19',
      challenge_id: 1,
      created_at: new Date().toISOString(),
    });
    summarySpy.mockResolvedValue({
      challenge: mockChallenge,
      startDate: '2026-09-15',
      endDate: '2026-09-21',
      remainingDays: 4,
      remainingRestQuota: 0,
      isEnded: false,
      isSettled: false,
    });

    // 點擊設為休息日
    await act(async () => {
      fireEvent.press(restBtn);
    });

    expect(setRestDaySpy).toHaveBeenCalled();

    // 點擊取消休息
    const cancelBtn = await screen.findByRole('button', { name: '取消休息' });
    expect(cancelBtn).toBeTruthy();

    await act(async () => {
      fireEvent.press(cancelBtn);
    });

    expect(cancelRestDaySpy).toHaveBeenCalled();
  });
});
