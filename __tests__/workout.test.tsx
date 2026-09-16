import { render, fireEvent, act } from '@testing-library/react-native';
import WorkoutScreen from '../src/app/workout';

const mockBack = jest.fn();
const mockPush = jest.fn();
const mockDismissTo = jest.fn();
let mockSearchParams: Record<string, string> = {};

jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: mockBack,
    push: mockPush,
    replace: jest.fn(),
    dismissTo: mockDismissTo,
  }),
  useLocalSearchParams: () => mockSearchParams,
}));

const mockGetFirstAsync = jest.fn();
const mockRunAsync = jest.fn().mockResolvedValue({ lastInsertRowId: 1, changes: 1 });
jest.mock('expo-sqlite', () => ({
  useSQLiteContext: () => ({
    getFirstAsync: (...args: any[]) => mockGetFirstAsync(...args),
    runAsync: (...args: any[]) => mockRunAsync(...args),
  }),
}));

// Mock expo-keep-awake
jest.mock('expo-keep-awake', () => ({
  activateKeepAwakeAsync: jest.fn().mockResolvedValue(undefined),
  deactivateKeepAwake: jest.fn(),
}));

// Mock audio-service
jest.mock('../src/features/workout/audio-service', () => {
  return {
    TabataAudioService: jest.fn().mockImplementation(() => ({
      initialize: jest.fn().mockResolvedValue(true),
      playBgm: jest.fn().mockResolvedValue(undefined),
      playVoice: jest.fn().mockResolvedValue(undefined),
      playCue: jest.fn().mockResolvedValue(undefined),
      pause: jest.fn().mockResolvedValue(undefined),
      resume: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
      isDegraded: false,
    })),
  };
});

describe('WorkoutScreen (Phase 4 Tabata 計時器)', () => {
  beforeEach(() => {
    jest.useFakeTimers({
      doNotFake: ['setTimeout', 'setImmediate'],
    });
    mockBack.mockClear();
    mockPush.mockClear();
    mockDismissTo.mockClear();
    mockSearchParams = {};
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
    const { getByText, getByRole, UNSAFE_getByProps } = render(<WorkoutScreen />);

    const backdrop = UNSAFE_getByProps({ testID: 'nature-backdrop' });
    expect(backdrop.props.pointerEvents).toBe('none');
    expect(backdrop.props.accessible).toBe(false);
    expect(backdrop.props.accessibilityElementsHidden).toBe(true);
    expect(backdrop.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(backdrop.parent?.children[0]).toBe(backdrop);

    expect(getByText('運動 20 秒')).toBeTruthy();
    expect(getByText('休息 10 秒')).toBeTruthy();
    expect(getByText('4 組，最後一組後不休息')).toBeTruthy();
    expect(getByRole('button', { name: '開始' })).toBeTruthy();
  });

  it('在 ready 狀態點擊取消或返回，直接返回首頁，不顯示確認對話框', () => {
    const { getByRole, queryByText } = render(<WorkoutScreen />);

    fireEvent.press(getByRole('button', { name: '返回首頁' }));

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

  it('正常完成後寫入鎖定的開始日期與實際 UTC 完成時間，寫入成功才顯示完成並透過 dismissTo 返回首頁傳遞歸屬日', async () => {
    mockRunAsync.mockClear();
    mockRunAsync.mockResolvedValue({ lastInsertRowId: 1, changes: 1 });

    const { getByRole, getAllByRole, getByText } = render(<WorkoutScreen />);

    fireEvent.press(getByRole('button', { name: '開始' }));

    act(() => {
      jest.advanceTimersByTime(113500);
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mockRunAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO daily_completions'),
      expect.arrayContaining([expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), expect.any(String)])
    );

    // 寫入成功後顯示訓練完成與返回首頁按鈕
    expect(getByText('訓練完成！')).toBeTruthy();
    expect(getByText('本日波比跳 Tabata 訓練已完成')).toBeTruthy();
    const backButtons = getAllByRole('button', { name: '返回首頁' });
    expect(backButtons.length).toBeGreaterThanOrEqual(1);

    // 點擊返回首頁按鈕，透過 dismissTo 返回並傳遞 completedLocalDate
    fireEvent.press(backButtons[backButtons.length - 1]);
    expect(mockDismissTo).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: '/',
        params: expect.objectContaining({
          completedLocalDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        }),
      })
    );
  });

  it('寫入失敗時停在待儲存狀態，不顯示虛假成功，並提供重新儲存與放棄紀錄按鈕', async () => {
    mockRunAsync.mockClear();
    mockRunAsync.mockRejectedValueOnce(new Error('Database write failure'));

    const { getByRole, getByText, queryByText } = render(<WorkoutScreen />);

    fireEvent.press(getByRole('button', { name: '開始' }));

    act(() => {
      jest.advanceTimersByTime(113500);
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    // 不得顯示完成訊息
    expect(queryByText('訓練完成！')).toBeNull();

    // 顯示錯誤說明
    expect(getByText('儲存失敗')).toBeTruthy();

    // 提供「重新儲存」與「放棄紀錄」按鈕
    expect(getByRole('button', { name: '重新儲存' })).toBeTruthy();
    expect(getByRole('button', { name: '放棄紀錄' })).toBeTruthy();
  });

  it('手動重試成功且維持同一筆完成時間，成功後進入完成狀態', async () => {
    mockRunAsync.mockClear();
    // 第一次失敗，第二次成功
    mockRunAsync
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({ lastInsertRowId: 1, changes: 1 });

    const { getByRole, getByText, queryByText } = render(<WorkoutScreen />);

    fireEvent.press(getByRole('button', { name: '開始' }));

    act(() => {
      jest.advanceTimersByTime(113500);
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(getByText('儲存失敗')).toBeTruthy();
    expect(mockRunAsync).toHaveBeenCalledTimes(1);
    const firstCallArgs = mockRunAsync.mock.calls[0];

    // 點擊重新儲存
    fireEvent.press(getByRole('button', { name: '重新儲存' }));

    await new Promise((resolve) => setTimeout(resolve, 50));

    // 再次呼叫 runAsync，且參數（localDate 與 completedAt）完全一致
    expect(mockRunAsync).toHaveBeenCalledTimes(2);
    expect(mockRunAsync.mock.calls[1]).toEqual(firstCallArgs);

    // 儲存成功，進入完成狀態
    expect(getByText('訓練完成！')).toBeTruthy();
    expect(queryByText('儲存失敗')).toBeNull();
  });

  it('寫入失敗時點擊放棄紀錄或返回需先確認，取消確認留在原畫面，確認放棄後清空記憶體並返回首頁且不保存紀錄', async () => {
    mockRunAsync.mockClear();
    mockRunAsync.mockRejectedValue(new Error('Persistent error'));

    const { getByRole, getByText, queryByText } = render(<WorkoutScreen />);

    fireEvent.press(getByRole('button', { name: '開始' }));

    act(() => {
      jest.advanceTimersByTime(113500);
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(getByText('儲存失敗')).toBeTruthy();

    // 點擊放棄紀錄按鈕
    fireEvent.press(getByRole('button', { name: '放棄紀錄' }));

    // 顯示確認對話框
    expect(getByText('確定要放棄紀錄嗎？')).toBeTruthy();
    expect(getByText('離開後本次完成不會被記錄')).toBeTruthy();
    expect(mockBack).not.toHaveBeenCalled();

    // 點擊繼續儲存取消對話框
    fireEvent.press(getByRole('button', { name: '繼續儲存' }));
    expect(queryByText('確定要放棄紀錄嗎？')).toBeNull();
    expect(getByText('儲存失敗')).toBeTruthy();
    expect(mockBack).not.toHaveBeenCalled();

    // 點擊返回首頁按鈕（標頭）亦觸發相同放棄確認
    fireEvent.press(getByRole('button', { name: '返回首頁' }));
    expect(getByText('確定要放棄紀錄嗎？')).toBeTruthy();

    // 確認放棄並離開
    fireEvent.press(getByRole('button', { name: '放棄並離開' }));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  describe('不記錄訓練模式 (mode=unrecorded)', () => {
    beforeEach(() => {
      mockSearchParams = { mode: 'unrecorded' };
    });

    it('完成訓練後不呼叫 SQLite 寫入，直接顯示「本次訓練已完成」，點擊返回首頁以 router.back 返回', async () => {
      mockRunAsync.mockClear();

      const { getByRole, getAllByRole, getByText, queryByText } = render(<WorkoutScreen />);

      fireEvent.press(getByRole('button', { name: '開始' }));

      act(() => {
        jest.advanceTimersByTime(113500);
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      // 絕不呼叫 runAsync
      expect(mockRunAsync).not.toHaveBeenCalled();

      // 畫面不出現 saving 或 saveError 相關文案
      expect(queryByText('正在保存紀錄...')).toBeNull();
      expect(queryByText('儲存失敗')).toBeNull();
      expect(queryByText('重新儲存')).toBeNull();
      expect(queryByText('放棄紀錄')).toBeNull();

      // 顯示「訓練完成！」與「本次訓練已完成」
      expect(getByText('訓練完成！')).toBeTruthy();
      expect(getByText('本次訓練已完成')).toBeTruthy();
      expect(queryByText('本日波比跳 Tabata 訓練已完成')).toBeNull();
      expect(queryByText('已記錄')).toBeNull();

      // 點擊返回首頁按鈕，使用 router.back() 返回，不傳 local_date
      const backButtons = getAllByRole('button', { name: '返回首頁' });
      fireEvent.press(backButtons[backButtons.length - 1]);
      expect(mockBack).toHaveBeenCalledTimes(1);
      expect(mockDismissTo).not.toHaveBeenCalled();
    });
  });
});
