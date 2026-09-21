import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo, BackHandler, View } from 'react-native';
import HomeScreen from '../src/app/index';

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

const mockGetFirstAsync = jest.fn();
const mockGetAllAsync = jest.fn();
const mockDb = {
  getFirstAsync: (sql: string, ...args: any[]) => {
    if (typeof sql === 'string' && sql.includes('audio_preferences')) {
      return Promise.resolve({
        id: 1,
        voice_enabled: 1,
        cues_enabled: 1,
        music_enabled: 1,
      });
    }
    return mockGetFirstAsync(sql, ...args);
  },
  getAllAsync: (sql: string, ...args: any[]) => {
    return mockGetAllAsync(sql, ...args);
  },
  runAsync: jest.fn().mockResolvedValue({ lastInsertRowId: 1, changes: 1 }),
  execAsync: jest.fn().mockResolvedValue(undefined),
};

jest.mock('expo-sqlite', () => ({
  useSQLiteContext: () => mockDb,
  SQLiteProvider: ({ children }: any) => children,
}));

const mockHasPresentedOnboarding = jest.fn();
const mockMarkOnboardingPresented = jest.fn();
jest.mock('../src/data/onboarding', () => ({
  hasPresentedOnboarding: (...args: any[]) => mockHasPresentedOnboarding(...args),
  markOnboardingPresented: (...args: any[]) => mockMarkOnboardingPresented(...args),
}));

const mockGetUserProfile = jest.fn();
const mockUpdateNickname = jest.fn();
jest.mock('../src/data/profile', () => ({
  getUserProfile: (...args: any[]) => mockGetUserProfile(...args),
  updateNickname: (...args: any[]) => mockUpdateNickname(...args),
}));

describe('HomeScreen Phase 2 Additional (底部導覽、GO 與狀態呈現)', () => {
  let announceSpy: jest.SpyInstance;
  let backHandlerCallbacks: (() => boolean)[] = [];

  const triggerBackPress = () => {
    const currentHandler = backHandlerCallbacks[backHandlerCallbacks.length - 1];
    return currentHandler ? currentHandler() : false;
  };

  beforeEach(() => {
    jest.useFakeTimers({
      doNotFake: ['setTimeout', 'setInterval', 'setImmediate'],
    });
    jest.setSystemTime(new Date(2026, 8, 9, 10, 0, 0)); // 2026-09-09
    mockPush.mockClear();
    mockSearchParams = {};
    mockGetFirstAsync.mockReset();
    mockGetFirstAsync.mockResolvedValue(null);
    mockGetAllAsync.mockReset();
    mockGetAllAsync.mockResolvedValue([]);
    mockHasPresentedOnboarding.mockReset();
    mockHasPresentedOnboarding.mockResolvedValue(true);
    mockMarkOnboardingPresented.mockReset();
    mockMarkOnboardingPresented.mockResolvedValue(undefined);
    mockGetUserProfile.mockReset();
    mockGetUserProfile.mockResolvedValue({ nickname: null });
    mockUpdateNickname.mockReset();
    mockUpdateNickname.mockResolvedValue(undefined);

    backHandlerCallbacks = [];
    jest.spyOn(BackHandler, 'addEventListener').mockImplementation((event: string, handler: any) => {
      if (event === 'hardwareBackPress') {
        backHandlerCallbacks.push(handler);
      }
      return {
        remove: () => {
          backHandlerCallbacks = backHandlerCallbacks.filter((cb) => cb !== handler);
        },
      } as any;
    });

    announceSpy = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
  });

  afterEach(() => {
    jest.useRealTimers();
    announceSpy.mockRestore();
    jest.restoreAllMocks();
  });

  describe('Section 1: 底部導覽列與 tab 狀態', () => {
    it('底部導覽列包含「首頁」與「日曆」tab，預設首頁選取', async () => {
      render(<HomeScreen />);

      await screen.findByText('今日待完成');

      const tablist = screen.getByRole('tablist');
      expect(tablist).toBeTruthy();

      const homeTab = screen.getByRole('tab', { name: '首頁' });
      const calendarTab = screen.getByRole('tab', { name: '日曆' });

      expect(homeTab.props.accessibilityState?.selected).toBe(true);
      expect(calendarTab.props.accessibilityState?.selected).toBe(false);

      // 非當前 tab 的內容具備無障礙隱藏
      const hiddenViews = screen.UNSAFE_getAllByType(View).filter(
        (v) => v.props.accessibilityElementsHidden === true
      );
      expect(hiddenViews.length).toBeGreaterThanOrEqual(1);
    });

    it('點擊「日曆」切換至日曆 tab，再次點擊目前已選取 tab 為 no-op', async () => {
      render(<HomeScreen />);

      await screen.findByText('今日待完成');

      const calendarTab = screen.getByRole('tab', { name: '日曆' });
      fireEvent.press(calendarTab);

      expect(calendarTab.props.accessibilityState?.selected).toBe(true);
      expect(screen.getByRole('tab', { name: '首頁' }).props.accessibilityState?.selected).toBe(false);

      // 再次點擊日曆 tab 為 no-op
      fireEvent.press(calendarTab);
      expect(calendarTab.props.accessibilityState?.selected).toBe(true);
    });

    it('Android 返回鍵在日曆 tab 先切回首頁並宣告「首頁」，在首頁時回傳 false', async () => {
      render(<HomeScreen />);

      await screen.findByText('今日待完成');

      // 切換至日曆 tab
      fireEvent.press(screen.getByRole('tab', { name: '日曆' }));
      expect(screen.getByRole('tab', { name: '日曆' }).props.accessibilityState?.selected).toBe(true);

      // 觸發 Android 返回鍵
      expect(backHandlerCallbacks.length).toBeGreaterThanOrEqual(1);
      let handled = false;
      await act(async () => {
        handled = triggerBackPress();
      });

      expect(handled).toBe(true);
      expect(announceSpy).toHaveBeenCalledWith('首頁');
      expect(screen.getByRole('tab', { name: '首頁' }).props.accessibilityState?.selected).toBe(true);

      // 再次於首頁按返回鍵，應交由系統處理 (return false)
      let handledAtHome = true;
      await act(async () => {
        handledAtHome = triggerBackPress();
      });
      expect(handledAtHome).toBe(false);
    });
  });

  describe('Section 2: 首頁核心區與 GO 狀態矩陣', () => {
    it('待完成狀態下：顯示日期、待完成、引導語與 GO，點擊 GO 導航至 /workout', async () => {
      render(<HomeScreen />);

      expect(await screen.findByText('2026 年 9 月 9 日')).toBeTruthy();
      expect(screen.getByText('今日待完成')).toBeTruthy();
      expect(screen.getByText('準備開始今天的訓練了嗎')).toBeTruthy();

      const goButton = screen.getByRole('button', { name: 'GO，開始今天的 2 分鐘' });
      expect(goButton).toBeTruthy();

      fireEvent.press(goButton);
      expect(mockPush).toHaveBeenCalledWith('/workout');
    });

    it('休息日狀態下：顯示日期、休息日、引導語、GO 與「取消休息」', async () => {
      mockGetFirstAsync.mockImplementation((sql: string) => {
        if (typeof sql === 'string' && sql.includes('rest_days')) {
          return Promise.resolve({
            local_date: '2026-09-09',
            challenge_id: 1,
            created_at: new Date().toISOString(),
          });
        }
        return Promise.resolve(null);
      });

      render(<HomeScreen />);

      expect(await screen.findByText('今日為休息日')).toBeTruthy();
      expect(screen.getByText('準備開始今天的訓練了嗎')).toBeTruthy();

      const goButton = screen.getByRole('button', { name: 'GO，開始今天的 2 分鐘' });
      expect(goButton).toBeTruthy();
      expect(screen.getByRole('button', { name: '取消休息' })).toBeTruthy();

      fireEvent.press(goButton);
      expect(mockPush).toHaveBeenCalledWith('/workout');
    });

    it('今日已完成時：不顯示 GO 與引導語，顯示「再做一次」按鈕', async () => {
      mockGetFirstAsync.mockResolvedValue({
        local_date: '2026-09-09',
        completed_at: '2026-09-09T08:00:00.000Z',
      });

      render(<HomeScreen />);

      expect(await screen.findByText('今日已完成')).toBeTruthy();
      expect(screen.queryByRole('button', { name: 'GO，開始今天的 2 分鐘' })).toBeNull();
      expect(screen.queryByText('準備開始今天的訓練了嗎')).toBeNull();

      const repeatButton = screen.getByRole('button', { name: '再做一次' });
      expect(repeatButton).toBeTruthy();

      fireEvent.press(repeatButton);
      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/workout',
        params: { mode: 'unrecorded' },
      });
    });

    it('今日狀態 loading 時：不預先宣告狀態，不顯示 GO 與引導語', async () => {
      let resolveCompletion: (val: any) => void;
      mockGetFirstAsync.mockReturnValue(
        new Promise((resolve) => {
          resolveCompletion = resolve;
        })
      );

      render(<HomeScreen />);

      expect(screen.queryByText('今日待完成')).toBeNull();
      expect(screen.queryByText('今日已完成')).toBeNull();
      expect(screen.queryByRole('button', { name: 'GO，開始今天的 2 分鐘' })).toBeNull();
      expect(screen.queryByText('準備開始今天的訓練了嗎')).toBeNull();

      await act(async () => {
        resolveCompletion!(null);
      });

      expect(await screen.findByText('今日待完成')).toBeTruthy();
      expect(screen.getByRole('button', { name: 'GO，開始今天的 2 分鐘' })).toBeTruthy();
    });

    it('今日狀態 unavailable 時：顯示錯誤說明、「重新載入」與「開始訓練」，不顯示 GO', async () => {
      mockGetFirstAsync.mockRejectedValue(new Error('Fetch today failed'));

      render(<HomeScreen />);

      expect(await screen.findByText('暫時無法讀取今日紀錄')).toBeTruthy();
      expect(screen.queryByRole('button', { name: 'GO，開始今天的 2 分鐘' })).toBeNull();

      expect(screen.getByRole('button', { name: '重新載入' })).toBeTruthy();
      const startUnrecordedBtn = screen.getByRole('button', { name: '開始訓練' });
      expect(startUnrecordedBtn).toBeTruthy();

      fireEvent.press(startUnrecordedBtn);
      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/workout',
        params: { mode: 'unrecorded' },
      });
    });
  });

  describe('Section 3: Reduce Motion 與 GO 動畫', () => {
    it('開啟 Reduce Motion 時不啟動呼吸循環', async () => {
      jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);

      render(<HomeScreen />);

      expect(await screen.findByRole('button', { name: 'GO，開始今天的 2 分鐘' })).toBeTruthy();
    });
  });

  describe('Section 4: 日曆操作與日期邊界', () => {
    it('日曆頁包含月份切換、回到今天及點擊日期進入 /day', async () => {
      render(<HomeScreen />);

      await screen.findByText('今日待完成');

      // 切換至日曆 tab
      const calendarTab = screen.getByRole('tab', { name: '日曆' });
      fireEvent.press(calendarTab);

      expect(screen.getByText('2026 年 9 月')).toBeTruthy();
      expect(screen.getByRole('button', { name: '上一月' })).toBeTruthy();
      expect(screen.getByRole('button', { name: '下一月' })).toBeTruthy();

      // 點擊上一月
      await act(async () => {
        fireEvent.press(screen.getByRole('button', { name: '上一月' }));
      });
      expect(await screen.findByText('2026 年 8 月')).toBeTruthy();

      // 回到今天按鈕出現
      const backToToday = screen.getByRole('button', { name: '回到今天' });
      expect(backToToday).toBeTruthy();
      await act(async () => {
        fireEvent.press(backToToday);
      });
      expect(await screen.findByText('2026 年 9 月')).toBeTruthy();

      // 點擊日期格進入 /day
      const todayCell = await screen.findByRole('button', { name: '9 日 今天' });
      fireEvent.press(todayCell);
      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/day',
        params: { date: '2026-09-09' },
      });
    });

    it('一般訓練完成帶 completedLocalDate 返回，首頁維持首頁並刷新，日曆對齊歸屬月', async () => {
      mockSearchParams = { completedLocalDate: '2026-08-31' };
      mockGetFirstAsync.mockResolvedValueOnce({
        local_date: '2026-09-09',
        completed_at: '2026-09-09T08:00:00.000Z',
      });
      mockGetAllAsync.mockResolvedValueOnce([
        { local_date: '2026-08-31', completed_at: '2026-08-31T23:59:00.000Z' },
      ]);

      render(<HomeScreen />);

      const homeTab = await screen.findByRole('tab', { name: '首頁' });
      expect(homeTab.props.accessibilityState?.selected).toBe(true);
      expect(await screen.findByText('今日已完成')).toBeTruthy();

      // 切換至日曆驗證對齊 8 月
      fireEvent.press(screen.getByRole('tab', { name: '日曆' }));
      expect(await screen.findByText('2026 年 8 月')).toBeTruthy();
      expect(await screen.findByRole('button', { name: '31 日 已完成' })).toBeTruthy();
    });

    it('跨午夜返回時，新當地日未完成則顯示「今日待完成」與 GO', async () => {
      jest.setSystemTime(new Date(2026, 0, 31, 23, 50, 0));
      const { rerender } = render(<HomeScreen />);

      expect(await screen.findByText('2026 年 1 月 31 日')).toBeTruthy();

      // 前進到 2026-02-01
      jest.setSystemTime(new Date(2026, 1, 1, 0, 5, 0));
      mockSearchParams = { completedLocalDate: '2026-01-31' };
      mockGetFirstAsync.mockResolvedValue(null);
      mockGetAllAsync.mockResolvedValue([
        { local_date: '2026-01-31', completed_at: '2026-01-31T23:59:00.000Z' },
      ]);

      rerender(<HomeScreen />);

      expect(await screen.findByText('2026 年 2 月 1 日')).toBeTruthy();
      expect(await screen.findByText('今日待完成')).toBeTruthy();
      expect(screen.getByRole('button', { name: 'GO，開始今天的 2 分鐘' })).toBeTruthy();

      // 切換至日曆對齊 1 月
      fireEvent.press(screen.getByRole('tab', { name: '日曆' }));
      expect(await screen.findByText('2026 年 1 月')).toBeTruthy();
      expect(await screen.findByRole('button', { name: '31 日 已完成' })).toBeTruthy();
    });
  });

  describe('Section 5: 教學與設定 Modal', () => {
    it('點擊教學按鈕開啟 TutorialModal', async () => {
      render(<HomeScreen />);
      await screen.findByText('今日待完成');

      fireEvent.press(screen.getByRole('button', { name: '動作教學' }));
      expect(await screen.findByText('教學影片準備中')).toBeTruthy();

      const closeButtons = screen.getAllByRole('button', { name: '關閉' });
      fireEvent.press(closeButtons[0]);

      await waitFor(() => {
        expect(screen.queryByText('教學影片準備中')).toBeNull();
      });
    });

    it('點擊設定按鈕開啟 SettingsModal', async () => {
      render(<HomeScreen />);
      await screen.findByText('今日待完成');

      fireEvent.press(screen.getByRole('button', { name: '設定' }));
      expect(await screen.findByText('設定')).toBeTruthy();
      expect(screen.getByText('個人資料')).toBeTruthy();
      expect(screen.getByText('音訊')).toBeTruthy();
    });
  });
});
