import { fireEvent, render, screen } from '@testing-library/react-native';
import HomeScreen from '../src/app/index';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    back: jest.fn(),
  }),
}));

const mockGetFirstAsync = jest.fn();
jest.mock('expo-sqlite', () => ({
  useSQLiteContext: () => ({
    getFirstAsync: (...args: any[]) => mockGetFirstAsync(...args),
    getAllAsync: jest.fn().mockResolvedValue([]),
    runAsync: jest.fn().mockResolvedValue({ lastInsertRowId: 1, changes: 1 }),
    execAsync: jest.fn().mockResolvedValue(undefined),
  }),
  SQLiteProvider: ({ children }: any) => children,
}));

describe('首頁日曆 (Phase 2 Tracer Slice)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 8, 9, 10, 0, 0)); // 2026-09-09
    mockPush.mockClear();
    mockGetFirstAsync.mockReset();
    mockGetFirstAsync.mockResolvedValue(null);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('未有完成紀錄時，開啟 App 顯示目前月份、今天與「開始今天的 2 分鐘」', async () => {
    render(<HomeScreen />);

    // 顯示目前月份 (2026 年 9 月)
    expect(screen.getByText('2026 年 9 月')).toBeTruthy();

    // 顯示今天資訊
    expect(screen.getByText('今天')).toBeTruthy();
    expect(screen.getByText('9 月 9 日')).toBeTruthy();

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
});
