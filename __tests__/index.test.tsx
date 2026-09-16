import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import HomeScreen from '../src/app/index';

const mockPush = jest.fn();
let focusCallback: (() => void | (() => void)) | null = null;
let mockSearchParams: Record<string, string> = {};

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => mockSearchParams,
  useFocusEffect: (cb: any) => {
    focusCallback = cb;
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
  getAllAsync: (...args: any[]) => mockGetAllAsync(...args),
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

describe('HomeScreen 首頁與日曆導覽調整 (Post-MVP Phase 1 Additional)', () => {
  let announceSpy: jest.SpyInstance;
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
    focusCallback = null;

    announceSpy = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
  });

  afterEach(() => {
    jest.useRealTimers();
    announceSpy.mockRestore();
  });

  describe('Slice 1: 今日狀態首頁', () => {
    it('啟動 gate 後首屏為首頁，導覽段為首頁選中，顯示今日完整年月日與「今日待完成」', async () => {
      const { UNSAFE_getByProps } = render(<HomeScreen />);

      // 背景裝飾存在
      const backdrop = UNSAFE_getByProps({ testID: 'nature-backdrop' });
      expect(backdrop.props.pointerEvents).toBe('none');

      // 導覽段為首頁（第 1 頁，共 2 頁）選中
      const homeSegment = await screen.findByRole('button', { name: '首頁，第 1 頁，共 2 頁' });
      const calendarSegment = screen.getByRole('button', { name: '日曆，第 2 頁，共 2 頁' });
      expect(homeSegment.props.accessibilityState?.selected).toBe(true);
      expect(calendarSegment.props.accessibilityState?.selected).toBe(false);

      // 顯示完整今日日期（2026 年 9 月 9 日）
      expect(screen.getByText('2026 年 9 月 9 日')).toBeTruthy();

      // 今日未完成，顯示「今日待完成」
      expect(await screen.findByText('今日待完成')).toBeTruthy();

      // 單一主要操作為「開始今天的 2 分鐘」
      const startButton = screen.getByRole('button', { name: '開始今天的 2 分鐘' });
      expect(startButton).toBeTruthy();
      expect(startButton.props.accessibilityState?.disabled).toBeFalsy();

      // 首頁左上方有動作教學與設定按鈕
      expect(screen.getByRole('button', { name: '動作教學' })).toBeTruthy();
      expect(screen.getByRole('button', { name: '設定' })).toBeTruthy();

      // 首頁不顯示月份切換控制（上一月、下一月不應存在於首頁互動中）
      expect(screen.queryByRole('button', { name: '今天完成了' })).toBeNull();
    });

    it('今日完成紀錄查詢中時，狀態與主要按鈕維持 loading 且不可操作，不短暫顯示待完成', async () => {
      let resolveCompletion: (val: any) => void;
      mockGetFirstAsync.mockReturnValue(
        new Promise((resolve) => {
          resolveCompletion = resolve;
        })
      );

      render(<HomeScreen />);

      // 仍在 loading 時，不顯示「今日待完成」或「今日已完成」
      expect(screen.queryByText('今日待完成')).toBeNull();
      expect(screen.queryByText('今日已完成')).toBeNull();

      // 主要按鈕為 disabled
      const startButton = await screen.findByRole('button', { name: '開始今天的 2 分鐘' });
      expect(startButton.props.accessibilityState?.disabled).toBe(true);

      // 完成查詢後更新為待完成與可點擊
      await act(async () => {
        resolveCompletion!(null);
      });

      expect(await screen.findByText('今日待完成')).toBeTruthy();
      expect(screen.getByRole('button', { name: '開始今天的 2 分鐘' }).props.accessibilityState?.disabled).toBeFalsy();
    });

    it('點擊「開始今天的 2 分鐘」以一般模式導航至 /workout', async () => {
      render(<HomeScreen />);

      const startButton = await screen.findByRole('button', { name: '開始今天的 2 分鐘' });
      fireEvent.press(startButton);

      expect(mockPush).toHaveBeenCalledWith('/workout');
    });

    it('今日已完成時顯示「今日已完成」，主要按鈕為可操作的「再做一次」，點擊後以 mode=unrecorded 開啟 workout', async () => {
      mockGetFirstAsync.mockResolvedValue({
        local_date: '2026-09-09',
        completed_at: '2026-09-09T08:00:00.000Z',
      });

      render(<HomeScreen />);

      expect(await screen.findByText('今日已完成')).toBeTruthy();
      const repeatButton = screen.getByRole('button', { name: '再做一次' });
      expect(repeatButton).toBeTruthy();
      expect(repeatButton.props.accessibilityState?.disabled).toBeFalsy();

      // 不再出現停用的「今天完成了」
      expect(screen.queryByRole('button', { name: '今天完成了' })).toBeNull();

      // 點擊「再做一次」
      fireEvent.press(repeatButton);
      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/workout',
        params: { mode: 'unrecorded' },
      });
    });

    it('今日紀錄初次查詢失敗時進入 unavailable，顯示錯誤說明、「重新載入」與「開始訓練」', async () => {
      mockGetFirstAsync.mockRejectedValue(new Error('Fetch today failed'));

      render(<HomeScreen />);

      expect(await screen.findByText('暫時無法讀取今日紀錄')).toBeTruthy();
      expect(screen.getByRole('button', { name: '重新載入' })).toBeTruthy();

      const startUnrecordedButton = screen.getByRole('button', { name: '開始訓練' });
      expect(startUnrecordedButton).toBeTruthy();
      expect(
        screen.getByText('目前無法確認今天是否已有紀錄。若直接開始，本次訓練不會被記錄。')
      ).toBeTruthy();

      // 點擊「開始訓練」，以 mode=unrecorded 開啟 workout
      fireEvent.press(startUnrecordedButton);
      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/workout',
        params: { mode: 'unrecorded' },
      });

      // 點擊「重新載入」重試查詢今日紀錄
      mockGetFirstAsync.mockResolvedValueOnce(null);
      const reloadButton = screen.getByRole('button', { name: '重新載入' });
      await act(async () => {
        fireEvent.press(reloadButton);
      });

      expect(await screen.findByText('今日待完成')).toBeTruthy();
    });

    it('同日已有可信狀態後，後續刷新失敗保留最後已知狀態', async () => {
      mockGetFirstAsync.mockResolvedValueOnce({
        local_date: '2026-09-09',
        completed_at: '2026-09-09T08:00:00.000Z',
      });

      render(<HomeScreen />);

      expect(await screen.findByText('今日已完成')).toBeTruthy();

      // 模擬背景刷新失敗
      mockGetFirstAsync.mockRejectedValue(new Error('Network error on refresh'));
      await act(async () => {
        await focusCallback?.();
      });

      // 維持今日已完成，不變成 unavailable
      expect(screen.getByText('今日已完成')).toBeTruthy();
      expect(screen.queryByText('暫時無法讀取今日紀錄')).toBeNull();
    });
  });

  describe('Slice 2: 第二頁日曆與兩種導覽', () => {
    it('點擊導覽列「日曆」段切換至第二頁，宣告無障礙文字，且日曆頁不顯示訓練按鈕', async () => {
      render(<HomeScreen />);

      await screen.findByText('今日待完成');

      const calendarSegment = screen.getByRole('button', { name: '日曆，第 2 頁，共 2 頁' });
      fireEvent.press(calendarSegment);

      // 宣告日曆頁
      expect(announceSpy).toHaveBeenCalledWith('日曆，第 2 頁，共 2 頁');
      expect(calendarSegment.props.accessibilityState?.selected).toBe(true);

      // 第二頁顯示月曆相關元素
      expect(screen.getByText('2026 年 9 月')).toBeTruthy();
      expect(screen.getByRole('button', { name: '上一月' })).toBeTruthy();
      expect(screen.getByRole('button', { name: '下一月' })).toBeTruthy();

      // 目前月份的日曆頁不出現訓練按鈕，也不出現「回到今天」
      expect(screen.queryByRole('button', { name: '開始今天的 2 分鐘' })).toBeNull();
      expect(screen.queryByRole('button', { name: '回到今天' })).toBeNull();
    });

    it('在非當前月時顯示「回到今天」，點擊後僅切換月曆月份至當前月，不切換至第一頁', async () => {
      render(<HomeScreen />);

      await screen.findByText('今日待完成');

      // 切換至日曆頁
      fireEvent.press(screen.getByRole('button', { name: '日曆，第 2 頁，共 2 頁' }));

      // 點擊上一月
      fireEvent.press(screen.getByRole('button', { name: '上一月' }));
      expect(screen.getByText('2026 年 8 月')).toBeTruthy();

      // 顯示回到今天按鈕
      const backToTodayButton = screen.getByRole('button', { name: '回到今天' });
      expect(backToTodayButton).toBeTruthy();

      // 點擊回到今天
      fireEvent.press(backToTodayButton);

      // 月曆回到 2026 年 9 月
      expect(screen.getByText('2026 年 9 月')).toBeTruthy();
      // 仍然停留在日曆頁（第 2 頁），導覽段仍為日曆選中
      expect(screen.getByRole('button', { name: '日曆，第 2 頁，共 2 頁' }).props.accessibilityState?.selected).toBe(true);
    });

    it('月曆初次讀取失敗時顯示「暫時無法讀取月曆紀錄」與「重新載入」按鈕', async () => {
      mockGetAllAsync.mockRejectedValue(new Error('Month read fail'));

      render(<HomeScreen />);

      await screen.findByText('今日待完成');

      // 切換至日曆頁
      fireEvent.press(screen.getByRole('button', { name: '日曆，第 2 頁，共 2 頁' }));

      expect(await screen.findByText('暫時無法讀取月曆紀錄')).toBeTruthy();

      // 點擊重新載入
      mockGetAllAsync.mockResolvedValueOnce([
        { local_date: '2026-09-05', completed_at: '2026-09-05T08:00:00.000Z' },
      ]);
      const reloadMonthBtn = screen.getByRole('button', { name: '重新載入' });
      await act(async () => {
        fireEvent.press(reloadMonthBtn);
      });

      expect(await screen.findByRole('button', { name: '5 日 已完成' })).toBeTruthy();
    });

    it('點擊日期進入 /day 詳情', async () => {
      render(<HomeScreen />);

      await screen.findByText('今日待完成');

      // 切換至日曆頁
      fireEvent.press(screen.getByRole('button', { name: '日曆，第 2 頁，共 2 頁' }));

      const todayCell = await screen.findByRole('button', { name: '9 日 今天' });
      fireEvent.press(todayCell);

      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/day',
        params: { date: '2026-09-09' },
      });
    });
  });

  describe('Slice 5: 返回 focus 與日期邊界', () => {
    it('一般訓練保存後以 completedLocalDate 返回，首頁維持首頁並重新查詢，第二頁對齊歸屬月份', async () => {
      mockSearchParams = { completedLocalDate: '2026-08-31' };

      mockGetFirstAsync.mockResolvedValueOnce({
        local_date: '2026-09-09',
        completed_at: '2026-09-09T08:00:00.000Z',
      });
      mockGetAllAsync.mockResolvedValueOnce([
        { local_date: '2026-08-31', completed_at: '2026-08-31T23:59:00.000Z' },
      ]);

      render(<HomeScreen />);

      // 維持首頁（第 1 頁）
      const homeBtn = await screen.findByRole('button', { name: '首頁，第 1 頁，共 2 頁' });
      expect(homeBtn.props.accessibilityState?.selected).toBe(true);

      // 重新查詢今日狀態為已完成，主要按鈕為「再做一次」
      expect(await screen.findByText('今日已完成')).toBeTruthy();
      expect(screen.getByRole('button', { name: '再做一次' })).toBeTruthy();

      // 切換至第二頁驗證月份對齊到 2026 年 8 月
      fireEvent.press(screen.getByRole('button', { name: '日曆，第 2 頁，共 2 頁' }));
      expect(screen.getByText('2026 年 8 月')).toBeTruthy();
      expect(await screen.findByRole('button', { name: '31 日 已完成' })).toBeTruthy();
    });

    it('返回後重新查詢今日狀態失敗時，進入 unavailable 錯誤流程，不樂觀推定完成', async () => {
      mockSearchParams = { completedLocalDate: '2026-09-09' };
      mockGetFirstAsync.mockRejectedValue(new Error('Failed to query today'));

      render(<HomeScreen />);

      expect(await screen.findByText('暫時無法讀取今日紀錄')).toBeTruthy();
      expect(screen.getByRole('button', { name: '重新載入' })).toBeTruthy();
      expect(screen.getByRole('button', { name: '開始訓練' })).toBeTruthy();
    });

    it('跨午夜返回時，新當地日未完成則顯示「今日待完成」與「開始今天的 2 分鐘」', async () => {
      // 初始渲染在 2026-01-31
      jest.setSystemTime(new Date(2026, 0, 31, 23, 50, 0));
      const { rerender } = render(<HomeScreen />);

      expect(await screen.findByText('2026 年 1 月 31 日')).toBeTruthy();

      // 時間前進到 2026-02-01 00:05:00，帶 completedLocalDate: '2026-01-31' 返回
      jest.setSystemTime(new Date(2026, 1, 1, 0, 5, 0));
      mockSearchParams = { completedLocalDate: '2026-01-31' };
      mockGetFirstAsync.mockResolvedValue(null); // 2/1 今日尚未完成
      mockGetAllAsync.mockResolvedValue([
        { local_date: '2026-01-31', completed_at: '2026-01-31T23:59:00.000Z' },
      ]);

      rerender(<HomeScreen />);

      // 新當地日 2026-02-01 顯示今日待完成
      expect(await screen.findByText('2026 年 2 月 1 日')).toBeTruthy();
      expect(screen.getByText('今日待完成')).toBeTruthy();
      expect(screen.getByRole('button', { name: '開始今天的 2 分鐘' })).toBeTruthy();

      // 第二頁月曆對齊到 1 月並顯示 1/31 完成
      fireEvent.press(screen.getByRole('button', { name: '日曆，第 2 頁，共 2 頁' }));
      expect(screen.getByText('2026 年 1 月')).toBeTruthy();
      expect(await screen.findByRole('button', { name: '31 日 已完成' })).toBeTruthy();
    });
  });

  describe('Post-MVP Phase 1 首次引導、問候、教學與設定', () => {
    it('首次開啟進入 OnboardingScreen 並觸發 markOnboardingPresented', async () => {
      mockHasPresentedOnboarding.mockResolvedValue(false);

      render(<HomeScreen />);

      expect(await screen.findByText('想怎麼稱呼你？')).toBeTruthy();
      expect(mockMarkOnboardingPresented).toHaveBeenCalled();
    });

    it('回訪且有暱稱時，在首頁頂部控制列下方顯示「Hi，{暱稱}」', async () => {
      mockGetUserProfile.mockResolvedValue({ nickname: '小王' });

      render(<HomeScreen />);

      expect(await screen.findByText('Hi，小王')).toBeTruthy();
    });

    it('點擊教學按鈕開啟 TutorialModal', async () => {
      render(<HomeScreen />);

      await screen.findByText('今日待完成');

      const tutorialBtn = screen.getByRole('button', { name: '動作教學' });
      fireEvent.press(tutorialBtn);

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

      const settingsBtn = screen.getByRole('button', { name: '設定' });
      fireEvent.press(settingsBtn);

      expect(await screen.findByText('設定')).toBeTruthy();
      expect(screen.getByText('個人資料')).toBeTruthy();
      expect(screen.getByText('音訊')).toBeTruthy();
    });
  });
});
