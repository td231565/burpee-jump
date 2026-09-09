import { render, fireEvent, act } from '@testing-library/react-native';
import WorkoutScreen from '../src/app/workout';

const mockBack = jest.fn();
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: mockBack,
    push: mockPush,
    replace: jest.fn(),
  }),
}));

const mockGetFirstAsync = jest.fn();
jest.mock('expo-sqlite', () => ({
  useSQLiteContext: () => ({
    getFirstAsync: (...args: any[]) => mockGetFirstAsync(...args),
    runAsync: jest.fn().mockResolvedValue({ lastInsertRowId: 1, changes: 1 }),
  }),
}));

// Mock expo-keep-awake
jest.mock('expo-keep-awake', () => ({
  activateKeepAwakeAsync: jest.fn().mockResolvedValue(undefined),
  deactivateKeepAwake: jest.fn(),
}));

// Mock expo-audio
jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(() => ({
    loop: false,
    play: jest.fn(),
    pause: jest.fn(),
    seekTo: jest.fn().mockResolvedValue(undefined),
    addListener: jest.fn(() => ({ remove: jest.fn() })),
    release: jest.fn(),
  })),
  setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
  setIsAudioActiveAsync: jest.fn().mockResolvedValue(undefined),
}));

describe('WorkoutScreen (Phase 4 Tabata 計時器)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockBack.mockClear();
    mockPush.mockClear();
    mockGetFirstAsync.mockResolvedValue({
      voice_enabled: 1,
      cues_enabled: 1,
      music_enabled: 0,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('進入畫面時呈現固定說明與開始按鈕', () => {
    const { getByText, getByRole } = render(<WorkoutScreen />);

    expect(getByText('運動 20 秒')).toBeTruthy();
    expect(getByText('休息 10 秒')).toBeTruthy();
    expect(getByText('4 組，最後一組後不休息')).toBeTruthy();
    expect(getByRole('button', { name: '開始' })).toBeTruthy();
  });

  it('在 ready 狀態點擊取消或返回，直接返回日曆，不顯示確認對話框', () => {
    const { getByRole, queryByText } = render(<WorkoutScreen />);

    fireEvent.press(getByRole('button', { name: '返回日曆' }));

    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(queryByText('確定要取消訓練嗎？')).toBeNull();
  });

  it('按下開始後進入 3 秒準備倒數，此期間取消直接離開不需確認', () => {
    const { getByRole, getByText, queryByText } = render(<WorkoutScreen />);

    fireEvent.press(getByRole('button', { name: '開始' }));

    expect(getByText('準備')).toBeTruthy();
    expect(getByText('3')).toBeTruthy();

    // 在準備期間點擊取消按鈕
    fireEvent.press(getByRole('button', { name: '取消訓練' }));

    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(queryByText('確定要取消訓練嗎？')).toBeNull();
  });

  it('正式計時期間點擊取消會跳出確認對話框，確認後才返回', () => {
    const { getByRole, getByText, queryByText } = render(<WorkoutScreen />);

    fireEvent.press(getByRole('button', { name: '開始' }));

    // 快轉超過 3 秒準備
    act(() => {
      jest.advanceTimersByTime(3500);
    });

    expect(getByText('第 1 / 4 組')).toBeTruthy();
    expect(getByText('運動')).toBeTruthy();

    // 點擊取消訓練
    fireEvent.press(getByRole('button', { name: '取消訓練' }));

    // 跳出確認對話框
    expect(getByText('確定要取消訓練嗎？')).toBeTruthy();
    expect(getByText('本次訓練將不會被記錄')).toBeTruthy();
    expect(mockBack).not.toHaveBeenCalled();

    // 點擊繼續訓練關閉對話框
    fireEvent.press(getByRole('button', { name: '繼續訓練' }));
    expect(queryByText('確定要取消訓練嗎？')).toBeNull();

    // 再次點擊取消訓練並點擊「放棄並離開」
    fireEvent.press(getByRole('button', { name: '取消訓練' }));
    fireEvent.press(getByRole('button', { name: '放棄並離開' }));

    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('支援暫停與繼續操作', () => {
    const { getByRole, getByText, queryByText } = render(<WorkoutScreen />);

    fireEvent.press(getByRole('button', { name: '開始' }));

    act(() => {
      jest.advanceTimersByTime(3500);
    });

    // 點擊暫停
    fireEvent.press(getByRole('button', { name: '暫停' }));
    expect(getByText('已暫停')).toBeTruthy();
    expect(getByRole('button', { name: '繼續' })).toBeTruthy();

    // 點擊繼續
    fireEvent.press(getByRole('button', { name: '繼續' }));
    expect(queryByText('已暫停')).toBeNull();
    expect(getByRole('button', { name: '暫停' })).toBeTruthy();
  });
});
