import { render, fireEvent, act, screen } from '@testing-library/react-native';
import WorkoutScreen from '../src/app/workout';

const mockBack = jest.fn();
const mockPush = jest.fn();
const mockDismissTo = jest.fn();
let mockSearchParams: Record<string, string> = {};

jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

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
const mockDb = {
  getFirstAsync: (...args: any[]) => mockGetFirstAsync(...args),
  runAsync: (...args: any[]) => mockRunAsync(...args),
};
jest.mock('expo-sqlite', () => ({ useSQLiteContext: () => mockDb }));

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
  const waitForWorkoutSettings = async () => {
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByRole('button', { name: '開始' }).props.accessibilityState?.disabled).toBe(false);
  };

  const pressStart = async () => {
    await waitForWorkoutSettings();
    fireEvent.press(screen.getByRole('button', { name: '開始' }));
  };

  beforeEach(() => {
    jest.useFakeTimers({
      doNotFake: ['setTimeout', 'setImmediate'],
    });
    mockBack.mockClear();
    mockPush.mockClear();
    mockDismissTo.mockClear();
    mockSearchParams = {};
    mockRunAsync.mockReset();
    mockRunAsync.mockResolvedValue({ lastInsertRowId: 1, changes: 1 });
    mockGetFirstAsync.mockImplementation((sql: string) => Promise.resolve(
      sql.includes('workout_preferences')
        ? { work_seconds: 20, rest_seconds: 10, rounds: 4 }
        : { voice_enabled: 1, cues_enabled: 1, music_enabled: 0 }
    ));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('進入畫面時呈現預設 20／10／4 設定與開始按鈕，且不顯示固定流程文案', async () => {
    const { getByText, getByRole, queryByText, UNSAFE_getByProps } = render(<WorkoutScreen />);

    await waitForWorkoutSettings();

    const backdrop = UNSAFE_getByProps({ testID: 'nature-backdrop' });
    expect(backdrop.props.pointerEvents).toBe('none');
    expect(backdrop.props.accessible).toBe(false);
    expect(backdrop.props.accessibilityElementsHidden).toBe(true);
    expect(backdrop.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(backdrop.parent?.children[0]).toBe(backdrop);

    expect(getByText('20')).toBeTruthy();
    expect(getByText('10')).toBeTruthy();
    expect(getByText('4')).toBeTruthy();
    expect(getByText('訓練')).toBeTruthy();
    expect(getByRole('button', { name: '開始' })).toBeTruthy();
    expect(queryByText('固定流程')).toBeNull();
    expect(queryByText('最後一組後不休息')).toBeNull();
  });

  it('偏好讀取失敗時靜默使用預設值，仍可開始並只在開始時保存', async () => {
    mockGetFirstAsync.mockImplementation((sql: string) => sql.includes('workout_preferences')
      ? Promise.reject(new Error('偏好讀取失敗'))
      : Promise.resolve({ voice_enabled: 1, cues_enabled: 1, music_enabled: 0 }));

    const { getByText, queryByText } = render(<WorkoutScreen />);
    await waitForWorkoutSettings();
    expect(mockRunAsync).not.toHaveBeenCalledWith(
      expect.stringContaining('UPDATE workout_preferences'),
      expect.anything()
    );
    fireEvent.press(screen.getByRole('button', { name: '開始' }));

    expect(getByText('準備')).toBeTruthy();
    expect(queryByText('偏好讀取失敗')).toBeNull();
    expect(mockRunAsync).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE workout_preferences'),
      [20, 10, 4]
    );
  });

  it('加減控制以 2 秒／1 組步進到達上下限，調整後離開不保存草稿', async () => {
    const { getByRole, getByText, getAllByText } = render(<WorkoutScreen />);
    await waitForWorkoutSettings();

    fireEvent.press(getByRole('button', { name: '減少運動秒數' }));
    expect(getByText('18')).toBeTruthy();
    for (let i = 0; i < 4; i += 1) fireEvent.press(getByRole('button', { name: '減少運動秒數' }));
    expect(getAllByText('10')).toHaveLength(2);
    expect(getByRole('button', { name: '減少運動秒數' }).props.accessibilityState.disabled).toBe(true);
    for (let i = 0; i < 25; i += 1) fireEvent.press(getByRole('button', { name: '增加運動秒數' }));
    expect(getByText('60')).toBeTruthy();
    expect(getByRole('button', { name: '增加運動秒數' }).props.accessibilityState.disabled).toBe(true);

    fireEvent.press(getByRole('button', { name: '減少休息秒數' }));
    expect(getByText('8')).toBeTruthy();
    fireEvent.press(getByRole('button', { name: '減少休息秒數' }));
    expect(getByText('6')).toBeTruthy();
    expect(getByRole('button', { name: '減少休息秒數' }).props.accessibilityState.disabled).toBe(true);
    for (let i = 0; i < 12; i += 1) fireEvent.press(getByRole('button', { name: '增加休息秒數' }));
    expect(getByText('30')).toBeTruthy();
    expect(getByRole('button', { name: '增加休息秒數' }).props.accessibilityState.disabled).toBe(true);

    fireEvent.press(getByRole('button', { name: '減少組數' }));
    expect(getByText('3')).toBeTruthy();
    for (let i = 0; i < 2; i += 1) fireEvent.press(getByRole('button', { name: '減少組數' }));
    expect(getByText('1')).toBeTruthy();
    expect(getByRole('button', { name: '減少組數' }).props.accessibilityState.disabled).toBe(true);
    for (let i = 0; i < 9; i += 1) fireEvent.press(getByRole('button', { name: '增加組數' }));
    expect(getByText('10')).toBeTruthy();
    expect(getByRole('button', { name: '增加組數' }).props.accessibilityState.disabled).toBe(true);

    expect(mockRunAsync).not.toHaveBeenCalledWith(
      expect.stringContaining('UPDATE workout_preferences'),
      expect.anything()
    );
    fireEvent.press(getByRole('button', { name: '返回首頁' }));
    expect(mockRunAsync).not.toHaveBeenCalledWith(
      expect.stringContaining('UPDATE workout_preferences'),
      expect.anything()
    );
  });

  it('載入已保存的非預設值，並以相同組數顯示運動倒數', async () => {
    mockGetFirstAsync.mockImplementation((sql: string) => Promise.resolve(
      sql.includes('workout_preferences')
        ? { work_seconds: 16, rest_seconds: 8, rounds: 2 }
        : { voice_enabled: 1, cues_enabled: 1, music_enabled: 0 }
    ));
    const { getByRole, getByText } = render(<WorkoutScreen />);
    await waitForWorkoutSettings();
    expect(getByText('16')).toBeTruthy();
    expect(getByText('8')).toBeTruthy();
    expect(getByText('2')).toBeTruthy();

    fireEvent.press(getByRole('button', { name: '開始' }));
    act(() => {
      jest.advanceTimersByTime(3_500);
    });
    expect(getByText('第 1 / 2 組')).toBeTruthy();
    expect(getByText('16')).toBeTruthy();
  });

  it('可調整範圍內參數，按開始後即以單組短訓練完成並呼叫原子完成保存', async () => {
    mockRunAsync.mockClear();
    const { getByRole, getByText } = render(<WorkoutScreen />);
    await waitForWorkoutSettings();

    for (let i = 0; i < 5; i += 1) fireEvent.press(getByRole('button', { name: '減少運動秒數' }));
    for (let i = 0; i < 2; i += 1) fireEvent.press(getByRole('button', { name: '減少休息秒數' }));
    for (let i = 0; i < 3; i += 1) fireEvent.press(getByRole('button', { name: '減少組數' }));

    expect(getByText('10')).toBeTruthy();
    expect(getByText('6')).toBeTruthy();
    expect(getByText('1')).toBeTruthy();
    expect(mockRunAsync).not.toHaveBeenCalled();

    fireEvent.press(getByRole('button', { name: '開始' }));
    expect(mockRunAsync).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE workout_preferences'),
      [10, 6, 1]
    );

    act(() => {
      jest.advanceTimersByTime(13_500);
    });
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(getByText('訓練完成')).toBeTruthy();
    expect(mockRunAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO daily_completions'),
      [expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), expect.any(String)]
    );
    expect(mockRunAsync).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM rest_days'),
      [expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/)]
    );
  });

  it('訓練偏好保存失敗仍立即以當次設定開始且不顯示訊息', async () => {
    mockRunAsync.mockImplementation((sql: string) => sql.includes('UPDATE workout_preferences')
      ? Promise.reject(new Error('偏好保存失敗'))
      : Promise.resolve({ lastInsertRowId: 1, changes: 1 }));
    const { getByRole, getByText, queryByText } = render(<WorkoutScreen />);
    await waitForWorkoutSettings();
    fireEvent.press(getByRole('button', { name: '增加組數' }));
    fireEvent.press(getByRole('button', { name: '開始' }));

    expect(getByText('準備')).toBeTruthy();
    expect(queryByText('偏好保存失敗')).toBeNull();
    expect(mockRunAsync).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE workout_preferences'),
      [20, 10, 5]
    );
  });

  it('在 ready 狀態點擊取消或返回，直接返回首頁，不顯示確認對話框', () => {
    const { getByRole, queryByText } = render(<WorkoutScreen />);

    fireEvent.press(getByRole('button', { name: '返回首頁' }));

    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(queryByText('確定要取消訓練嗎？')).toBeNull();
  });

  it('按下開始後進入 3 秒準備倒數，此期間取消直接離開不需確認', async () => {
    const { getByRole, getByText, queryByText } = render(<WorkoutScreen />);

    await pressStart();

    expect(getByText('準備')).toBeTruthy();
    expect(getByText('3')).toBeTruthy();

    // 在準備期間點擊取消按鈕
    fireEvent.press(getByRole('button', { name: '取消訓練' }));

    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(queryByText('確定要取消訓練嗎？')).toBeNull();
  });

  it('正式計時期間點擊取消會跳出確認對話框，確認後才返回', async () => {
    const { getByRole, getByText, queryByText } = render(<WorkoutScreen />);

    await pressStart();

    // 快轉超過 3 秒準備
    act(() => {
      jest.advanceTimersByTime(3500);
    });

    expect(getByText('第 1 / 4 組')).toBeTruthy();
    expect(getByText('運動')).toBeTruthy();

    fireEvent.press(getByRole('button', { name: '取消訓練' }));
    expect(getByText('確定要取消訓練嗎？')).toBeTruthy();
    expect(getByText('本次訓練將不會被記錄')).toBeTruthy();
    expect(mockBack).not.toHaveBeenCalled();

    fireEvent.press(getByRole('button', { name: '繼續訓練' }));
    expect(queryByText('確定要取消訓練嗎？')).toBeNull();

    fireEvent.press(getByRole('button', { name: '取消訓練' }));
    fireEvent.press(getByRole('button', { name: '放棄並離開' }));

    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('支援暫停與繼續操作', async () => {
    const { getByRole, queryByText } = render(<WorkoutScreen />);

    await pressStart();

    act(() => {
      jest.advanceTimersByTime(3500);
    });

    fireEvent.press(getByRole('button', { name: '暫停' }));
    expect(queryByText('已暫停')).toBeNull();
    expect(getByRole('button', { name: '繼續' })).toBeTruthy();

    fireEvent.press(getByRole('button', { name: '繼續' }));
    expect(queryByText('已暫停')).toBeNull();
    expect(getByRole('button', { name: '暫停' })).toBeTruthy();
  });

  it('正常完成後寫入鎖定的開始日期與實際 UTC 完成時間，寫入成功才顯示完成並透過 dismissTo 返回首頁傳遞歸屬日', async () => {
    mockRunAsync.mockClear();
    mockRunAsync.mockResolvedValue({ lastInsertRowId: 1, changes: 1 });

    const { getByRole, getAllByRole, getByText } = render(<WorkoutScreen />);

    await pressStart();

    act(() => {
      jest.advanceTimersByTime(113500);
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mockRunAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO daily_completions'),
      expect.arrayContaining([expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), expect.any(String)])
    );

    expect(getByText('訓練完成')).toBeTruthy();
    expect(getByText('本日波比跳訓練已完成')).toBeTruthy();
    const backButtons = getAllByRole('button', { name: '返回首頁' });
    expect(backButtons.length).toBeGreaterThanOrEqual(1);

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
    mockRunAsync.mockImplementation((sql: string) => sql.includes('INSERT INTO daily_completions')
      ? Promise.reject(new Error('Database write failure'))
      : Promise.resolve({ lastInsertRowId: 1, changes: 1 }));

    const { getByRole, getByText, queryByText } = render(<WorkoutScreen />);

    await pressStart();

    act(() => {
      jest.advanceTimersByTime(113500);
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(queryByText('訓練完成')).toBeNull();
    expect(getByText('儲存失敗')).toBeTruthy();
    expect(getByRole('button', { name: '重新儲存' })).toBeTruthy();
    expect(getByRole('button', { name: '放棄紀錄' })).toBeTruthy();
  });

  it('手動重試成功且維持同一筆完成時間，成功後進入完成狀態', async () => {
    mockRunAsync.mockClear();
    let shouldFailFirstCompletion = true;
    mockRunAsync.mockImplementation((sql: string) => {
      if (shouldFailFirstCompletion && sql.includes('INSERT INTO daily_completions')) {
        shouldFailFirstCompletion = false;
        return Promise.reject(new Error('Network error'));
      }
      return Promise.resolve({ lastInsertRowId: 1, changes: 1 });
    });

    const { getByRole, getByText, queryByText } = render(<WorkoutScreen />);

    await pressStart();

    act(() => {
      jest.advanceTimersByTime(113500);
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(getByText('儲存失敗')).toBeTruthy();
    const completionWrite = mockRunAsync.mock.calls.find(([sql]) =>
      String(sql).includes('INSERT INTO daily_completions')
    );
    expect(completionWrite).toBeTruthy();

    fireEvent.press(getByRole('button', { name: '重新儲存' }));

    await new Promise((resolve) => setTimeout(resolve, 50));

    const completionWrites = mockRunAsync.mock.calls.filter(([sql]) =>
      String(sql).includes('INSERT INTO daily_completions')
    );
    expect(completionWrites).toHaveLength(2);
    expect(completionWrites[1]).toEqual(completionWrite);
    expect(getByText('訓練完成')).toBeTruthy();
    expect(queryByText('儲存失敗')).toBeNull();
  });

  it('寫入失敗時點擊放棄紀錄或返回需先確認，取消確認留在原畫面，確認放棄後清空記憶體並返回首頁且不保存紀錄', async () => {
    mockRunAsync.mockClear();
    mockRunAsync.mockImplementation((sql: string) => sql.includes('INSERT INTO daily_completions')
      ? Promise.reject(new Error('Persistent error'))
      : Promise.resolve({ lastInsertRowId: 1, changes: 1 }));

    const { getByRole, getByText, queryByText } = render(<WorkoutScreen />);

    await pressStart();

    act(() => {
      jest.advanceTimersByTime(113500);
    });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(getByText('儲存失敗')).toBeTruthy();

    fireEvent.press(getByRole('button', { name: '放棄紀錄' }));
    expect(getByText('確定要放棄紀錄嗎？')).toBeTruthy();
    expect(getByText('離開後本次完成不會被記錄')).toBeTruthy();
    expect(mockBack).not.toHaveBeenCalled();

    fireEvent.press(getByRole('button', { name: '繼續儲存' }));
    expect(queryByText('確定要放棄紀錄嗎？')).toBeNull();
    expect(getByText('儲存失敗')).toBeTruthy();
    expect(mockBack).not.toHaveBeenCalled();

    fireEvent.press(getByRole('button', { name: '返回首頁' }));
    expect(getByText('確定要放棄紀錄嗎？')).toBeTruthy();
    fireEvent.press(getByRole('button', { name: '放棄並離開' }));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  describe('不記錄訓練模式 (mode=unrecorded)', () => {
    beforeEach(() => {
      mockSearchParams = { mode: 'unrecorded' };
    });

    it('完成訓練後不呼叫完成紀錄寫入，只顯示「訓練完成」且移除本次完成說明', async () => {
      mockRunAsync.mockClear();

      const { getByRole, getAllByRole, getByText, queryByText } = render(<WorkoutScreen />);

      await pressStart();

      act(() => {
        jest.advanceTimersByTime(113500);
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE workout_preferences'),
        [20, 10, 4]
      );
      expect(mockRunAsync).not.toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO daily_completions'),
        expect.anything()
      );
      expect(queryByText('正在保存紀錄...')).toBeNull();
      expect(queryByText('儲存失敗')).toBeNull();
      expect(queryByText('重新儲存')).toBeNull();
      expect(queryByText('放棄紀錄')).toBeNull();
      expect(getByText('訓練完成')).toBeTruthy();
      expect(queryByText('本次訓練已完成')).toBeNull();
      expect(queryByText('本日波比跳訓練已完成')).toBeNull();
      expect(queryByText('已記錄')).toBeNull();

      const backButtons = getAllByRole('button', { name: '返回首頁' });
      fireEvent.press(backButtons[backButtons.length - 1]);
      expect(mockBack).toHaveBeenCalledTimes(1);
      expect(mockDismissTo).not.toHaveBeenCalled();
    });
  });
});
