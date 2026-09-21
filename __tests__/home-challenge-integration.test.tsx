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

describe('HomeScreen Phase 2 Additional 挑戰週期與日曆整合', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams = {};
    jest.spyOn(completionsData, 'getCompletionsForMonth').mockResolvedValue([]);
    jest.spyOn(completionsData, 'getCompletionByDate').mockResolvedValue(null);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('無活躍挑戰時，首頁不顯示挑戰入口；日曆頁顯示「設定挑戰週期」，點擊導航至 /challenge', async () => {
    jest.spyOn(challengesData, 'getActiveChallenge').mockResolvedValue(null);
    jest.spyOn(challengesData, 'getUnsettledEndedChallenge').mockResolvedValue(null);
    jest.spyOn(restDaysData, 'getRestDaysForRange').mockResolvedValue([]);
    jest.spyOn(restDaysData, 'getRestDayByDate').mockResolvedValue(null);

    render(<HomeScreen />);

    // 首頁不顯示挑戰建立入口
    await screen.findByText('今日待完成');
    expect(screen.queryByRole('button', { name: '開始挑戰' })).toBeNull();
    expect(screen.queryByRole('button', { name: '設定挑戰週期' })).toBeNull();

    // 切換至日曆 tab
    fireEvent.press(screen.getByRole('tab', { name: '日曆' }));

    const setupBtn = await screen.findByRole('button', { name: '設定挑戰週期' });
    expect(setupBtn).toBeTruthy();

    fireEvent.press(setupBtn);
    expect(mockPush).toHaveBeenCalledWith('/challenge');
  });

  it('有活躍挑戰時，日曆卡片頂部顯示「挑戰還有 x 天，可用休息 y 天」，首頁不顯示摘要', async () => {
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

    await screen.findByText('今日待完成');

    // 首頁不顯示挑戰摘要
    expect(screen.queryByText(/挑戰還有 4 天，可用休息 1 天/)).toBeNull();

    // 切換至日曆 tab
    fireEvent.press(screen.getByRole('tab', { name: '日曆' }));

    expect(await screen.findByText('挑戰還有 4 天，可用休息 1 天')).toBeTruthy();
    // 進行中挑戰不顯示設定挑戰週期按鈕
    expect(screen.queryByRole('button', { name: '設定挑戰週期' })).toBeNull();
  });

  it('challenge 載入失敗進入 unavailable，顯示「暫時無法讀取挑戰資料」與重新載入按鈕', async () => {
    jest.spyOn(challengesData, 'getActiveChallenge').mockRejectedValue(new Error('Challenge load error'));
    jest.spyOn(restDaysData, 'getRestDaysForRange').mockResolvedValue([]);
    jest.spyOn(restDaysData, 'getRestDayByDate').mockResolvedValue(null);

    render(<HomeScreen />);

    const calendarTab = await screen.findByRole('tab', { name: '日曆' });
    fireEvent.press(calendarTab);

    const retryChallengeBtn = await screen.findByRole('button', { name: '重新載入挑戰資料' });
    expect(retryChallengeBtn).toBeTruthy();
    expect(screen.getByText('暫時無法讀取挑戰資料')).toBeTruthy();

    // 模擬重新載入成功為無挑戰
    jest.spyOn(challengesData, 'getActiveChallenge').mockResolvedValueOnce(null);
    await act(async () => {
      fireEvent.press(retryChallengeBtn);
    });

    expect(await screen.findByRole('button', { name: '設定挑戰週期' })).toBeTruthy();
  });

  it('challenge 與 streak 失敗互不清空：streak 失敗不影響 challenge 摘要，challenge 失敗不影響 streak', async () => {
    const mockChallenge: challengesData.Challenge = {
      id: 1,
      start_date: '2026-09-15',
      duration_days: 7,
      rest_quota: 1,
      settled_at: null,
    };
    jest.spyOn(challengesData, 'getActiveChallenge').mockResolvedValue(mockChallenge);
    jest.spyOn(challengesData, 'getChallengeSummary').mockResolvedValue({
      challenge: mockChallenge,
      startDate: '2026-09-15',
      endDate: '2026-09-21',
      remainingDays: 4,
      remainingRestQuota: 1,
      isEnded: false,
      isSettled: false,
    });
    // 模擬 streak 查詢失敗
    jest.spyOn(restDaysData, 'getRestDaysForRange').mockRejectedValue(new Error('Streak records failed'));

    render(<HomeScreen />);

    const calendarTab = await screen.findByRole('tab', { name: '日曆' });
    fireEvent.press(calendarTab);

    // challenge 仍正常顯示
    expect(await screen.findByText('挑戰還有 4 天，可用休息 1 天')).toBeTruthy();

    // streak 顯示 unavailable 與獨立重試，不冒充 0 天
    expect(screen.getByRole('button', { name: '重新載入連續天數' })).toBeTruthy();
    expect(screen.getByText('暫時無法讀取連續天數')).toBeTruthy();
  });

  it('今日尚未完成且有剩餘額度時，首頁可點擊「把今天設為休息日」，並更新為「取消休息」', async () => {
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
