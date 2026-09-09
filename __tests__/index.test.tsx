import { act, fireEvent, render, screen } from '@testing-library/react-native';
import HomeScreen from '../src/app/index';

const mockPush = jest.fn();
let focusCallback: (() => void | (() => void)) | null = null;
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useFocusEffect: (cb: any) => {
    focusCallback = cb;
    cb();
  },
}));

const mockGetFirstAsync = jest.fn();
const mockGetAllAsync = jest.fn();
jest.mock('expo-sqlite', () => ({
  useSQLiteContext: () => ({
    getFirstAsync: (...args: any[]) => mockGetFirstAsync(...args),
    getAllAsync: (...args: any[]) => mockGetAllAsync(...args),
    runAsync: jest.fn().mockResolvedValue({ lastInsertRowId: 1, changes: 1 }),
    execAsync: jest.fn().mockResolvedValue(undefined),
  }),
  SQLiteProvider: ({ children }: any) => children,
}));

describe('首頁日曆 (Phase 2 Tracer Slice)', () => {
  beforeEach(() => {
    jest.useFakeTimers({
      doNotFake: ['setTimeout', 'setInterval', 'setImmediate'],
    });
    jest.setSystemTime(new Date(2026, 8, 9, 10, 0, 0)); // 2026-09-09
    mockPush.mockClear();
    mockGetFirstAsync.mockReset();
    mockGetFirstAsync.mockResolvedValue(null);
    mockGetAllAsync.mockReset();
    mockGetAllAsync.mockResolvedValue([]);
    focusCallback = null;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('未有完成紀錄時，開啟 App 顯示目前月份、今天與「開始今天的 2 分鐘」', async () => {
    render(<HomeScreen />);

    // 顯示目前月份 (2026 年 9 月)
    expect(screen.getByText('2026 年 9 月')).toBeTruthy();

    // 顯示今天資訊 (日曆中包含 9 日 今天)
    expect(screen.getByRole('button', { name: '9 日 今天' })).toBeTruthy();

    // 包含星期列表頭
    ['一', '二', '三', '四', '五', '六', '日'].forEach((w) => {
      expect(screen.getByText(w)).toBeTruthy();
    });

    // 顯示主要操作「開始今天的 2 分鐘」，且為按鈕角色與正確狀態
    const startButton = screen.getByRole('button', { name: '開始今天的 2 分鐘' });
    expect(startButton).toBeTruthy();
    expect(startButton.props.accessibilityState?.disabled).toBeFalsy();
  });

  it('點擊「開始今天的 2 分鐘」導航至 /workout 訓練畫面', async () => {
    render(<HomeScreen />);

    const startButton = screen.getByRole('button', { name: '開始今天的 2 分鐘' });
    fireEvent.press(startButton);

    expect(mockPush).toHaveBeenCalledWith('/workout');
  });

  it('今天已有完成紀錄時，主要操作顯示為不可點擊的「今天完成了」', async () => {
    mockGetFirstAsync.mockResolvedValue({
      local_date: '2026-09-09',
      completed_at: '2026-09-09T02:00:00.000Z',
    });

    render(<HomeScreen />);

    // 等待非同步 SQLite 狀態更新
    const completedButton = await screen.findByRole('button', { name: '今天完成了' });
    expect(completedButton).toBeTruthy();
    expect(completedButton.props.accessibilityState?.disabled).toBe(true);
  });

  describe('月份切換與回到今天 (Slice 2)', () => {
    it('點擊上一月切換至上個月，主要操作改為「回到今天」；點擊「回到今天」回到當前月', () => {
      render(<HomeScreen />);

      expect(screen.getByText('2026 年 9 月')).toBeTruthy();
      expect(screen.getByRole('button', { name: '開始今天的 2 分鐘' })).toBeTruthy();

      // 點擊上一月
      const prevButton = screen.getByRole('button', { name: '上一月' });
      fireEvent.press(prevButton);

      // 月份更新為 2026 年 8 月
      expect(screen.getByText('2026 年 8 月')).toBeTruthy();

      // 非目前月份時，主要操作改為「回到今天」，不提供開始訓練入口
      expect(screen.queryByRole('button', { name: '開始今天的 2 分鐘' })).toBeNull();
      const backTodayButton = screen.getByRole('button', { name: '回到今天' });
      expect(backTodayButton).toBeTruthy();

      // 點擊主要操作「回到今天」
      fireEvent.press(backTodayButton);

      // 回到 2026 年 9 月，恢復「開始今天的 2 分鐘」
      expect(screen.getByText('2026 年 9 月')).toBeTruthy();
      expect(screen.getByRole('button', { name: '開始今天的 2 分鐘' })).toBeTruthy();
    });

    it('點擊下一月切換至下個月，並可透過頁首「今天」按鈕快速回到當前月', () => {
      render(<HomeScreen />);

      const nextButton = screen.getByRole('button', { name: '下一月' });
      fireEvent.press(nextButton);

      expect(screen.getByText('2026 年 10 月')).toBeTruthy();
      expect(screen.getByRole('button', { name: '回到今天' })).toBeTruthy();

      // 透過頁首的「今天」按鈕回到目前月份
      const headerTodayButton = screen.getByRole('button', { name: '今天' });
      fireEvent.press(headerTodayButton);

      expect(screen.getByText('2026 年 9 月')).toBeTruthy();
      expect(screen.getByRole('button', { name: '開始今天的 2 分鐘' })).toBeTruthy();
    });
  });

  describe('開啟日期詳情與禁止不可互動格 (Slice 3)', () => {
    it('點擊本月今天或過去日期，導航至 /day 詳情', () => {
      render(<HomeScreen />);

      // 點擊今天 (9 日)
      const todayCell = screen.getByRole('button', { name: '9 日 今天' });
      fireEvent.press(todayCell);

      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/day',
        params: { date: '2026-09-09' },
      });

      // 點擊過去日期 (8 日)
      mockPush.mockClear();
      const pastCell = screen.getByRole('button', { name: '8 日' });
      fireEvent.press(pastCell);

      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/day',
        params: { date: '2026-09-08' },
      });
    });

    it('點擊非本月補位日期或未來日期，不觸發導航', () => {
      render(<HomeScreen />);

      // 點擊未來日期 (10 日)
      const futureCell = screen.getByRole('button', { name: '10 日' });
      fireEvent.press(futureCell);
      expect(mockPush).not.toHaveBeenCalled();

      // 點擊非本月補位日期 (31 日 非本月)
      const paddingCell = screen.getByRole('button', { name: '31 日 非本月' });
      fireEvent.press(paddingCell);
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe('已保存紀錄顯示完成標記 (Slice 4)', () => {
    it('讀取當月 SQLite 完成紀錄並在月曆上顯示完成標記', async () => {
      mockGetAllAsync.mockResolvedValue([
        { local_date: '2026-09-07', completed_at: '2026-09-07T06:30:00.000Z' },
      ]);

      render(<HomeScreen />);

      const completedDay = await screen.findByRole('button', { name: '7 日 已完成' });
      expect(completedDay).toBeTruthy();
    });
  });

  describe('畫面取得 focus 重新讀取當月最新紀錄 (Slice 5)', () => {
    it('畫面重新取得 focus 時重新查詢當月紀錄與今日狀態', async () => {
      render(<HomeScreen />);
      expect(screen.getByRole('button', { name: '開始今天的 2 分鐘' })).toBeTruthy();

      // 模擬在 workout 完成後，SQLite 寫入了今天的完成紀錄
      mockGetFirstAsync.mockResolvedValue({
        local_date: '2026-09-09',
        completed_at: '2026-09-09T08:00:00.000Z',
      });
      mockGetAllAsync.mockResolvedValue([
        { local_date: '2026-09-09', completed_at: '2026-09-09T08:00:00.000Z' },
      ]);

      // 觸發 focus 事件
      expect(focusCallback).not.toBeNull();
      act(() => {
        focusCallback?.();
      });

      // 月曆顯示 9 日 今天 已完成，主要操作更新為「今天完成了」
      const completedDay = await screen.findByRole('button', {
        name: '9 日 今天 已完成',
      });
      expect(completedDay).toBeTruthy();

      const completedButton = await screen.findByRole('button', {
        name: '今天完成了',
      });
      expect(completedButton).toBeTruthy();
    });
  });

  describe('頁首音訊設定按鈕 (Phase 4)', () => {
    it('點擊頁首設定按鈕開啟音訊設定 Modal', async () => {
      render(<HomeScreen />);

      const settingsButton = screen.getByRole('button', { name: '設定' });
      expect(settingsButton).toBeTruthy();

      fireEvent.press(settingsButton);

      expect(screen.getByText('音訊設定')).toBeTruthy();
      expect(screen.getByText('導引語音')).toBeTruthy();
      expect(screen.getByText('提示音效')).toBeTruthy();
      expect(screen.getByText('背景音樂')).toBeTruthy();
    });
  });
});


