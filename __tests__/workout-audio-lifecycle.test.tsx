import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
import WorkoutScreen from '../src/app/workout';

const mockBack = jest.fn();
const mockDismissTo = jest.fn();
let mockRouteParams: { mode?: string } = {};
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, dismissTo: mockDismissTo }),
  useLocalSearchParams: () => mockRouteParams,
}));

const mockDb = { getFirstAsync: jest.fn(), runAsync: jest.fn() };
jest.mock('expo-sqlite', () => ({ useSQLiteContext: () => mockDb }));
jest.mock('expo-keep-awake', () => ({
  activateKeepAwakeAsync: jest.fn().mockResolvedValue(undefined),
  deactivateKeepAwake: jest.fn(),
}));

const mockPlayers: {
  loop: boolean;
  playing: boolean;
  removed: boolean;
  play: () => void;
  pause: () => void;
  remove: () => void;
  seekTo: () => Promise<void>;
}[] = [];
let mockActive = true;
const mockMode = jest.fn().mockResolvedValue(undefined);
jest.mock('expo-audio', () => ({
  setAudioModeAsync: (...args: unknown[]) => mockMode(...args),
  setIsAudioActiveAsync: jest.fn(async (active: boolean) => {
    mockActive = active;
    if (!active) mockPlayers.forEach((player) => { player.playing = false; });
  }),
  createAudioPlayer: () => {
    const player = {
      loop: false,
      playing: false,
      removed: false,
      play: jest.fn(() => { player.playing = mockActive && !player.removed; }),
      pause: () => { player.playing = false; },
      remove: () => { player.removed = true; player.playing = false; },
      seekTo: async () => {},
    };
    mockPlayers.push(player);
    return player;
  },
}));

describe('訓練畫面與真實音訊服務的生命週期', () => {
  const enabledRow = { voice_enabled: 1, cues_enabled: 1, music_enabled: 1 };
  const workoutPreferencesRow = { work_seconds: 20, rest_seconds: 10, rounds: 4 };

  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = {};
    mockPlayers.length = 0;
    mockActive = true;
    mockDb.getFirstAsync.mockImplementation((query: string) => {
      if (query.includes('audio_preferences')) return Promise.resolve(enabledRow);
      if (query.includes('workout_preferences')) return Promise.resolve(workoutPreferencesRow);
      return Promise.reject(new Error(`Unexpected query: ${query}`));
    });
    mockDb.runAsync.mockResolvedValue(undefined);
    mockMode.mockResolvedValue(undefined);
  });

  it('等偏好讀取完成才初始化一次，保存的背景音樂關閉時不播放', async () => {
    let finishRead!: (row: typeof enabledRow) => void;
    mockDb.getFirstAsync.mockImplementationOnce(() => new Promise((resolve) => { finishRead = resolve; }));
    const screen = render(<WorkoutScreen />);
    await act(async () => {});
    expect(mockPlayers).toHaveLength(0);

    await act(async () => { finishRead({ ...enabledRow, music_enabled: 0 }); });
    await waitFor(() => expect(mockPlayers).toHaveLength(8));
    expect(mockPlayers.some((player) => player.loop || player.playing)).toBe(false);
    expect(mockDb.getFirstAsync).toHaveBeenCalledTimes(2);
    screen.unmount();
    await waitFor(() => expect(mockPlayers.every((player) => player.removed)).toBe(true));
  });

  it('音樂開啟時，取消返回再進入五次仍可播放並釋放所有舊播放器', async () => {
    for (let visit = 0; visit < 5; visit++) {
      const screen = render(<WorkoutScreen />);
      await waitFor(() => expect(mockPlayers.filter((player) => player.loop && player.playing)).toHaveLength(1));
      expect(mockPlayers.filter((player) => !player.removed)).toHaveLength(9);
      fireEvent.press(screen.getByRole('button', { name: '返回首頁' }));
      screen.unmount();
      await waitFor(() => expect(mockPlayers.every((player) => player.removed)).toBe(true));
      expect(mockPlayers.some((player) => player.playing)).toBe(false);
    }
    expect(mockBack).toHaveBeenCalledTimes(5);
    expect(mockDb.runAsync).not.toHaveBeenCalled();
  });

  it('初始化等待期間返回首頁，完成初始化後也不會播放或遺留播放器', async () => {
    let finishMode!: () => void;
    mockMode.mockImplementationOnce(() => new Promise<void>((resolve) => { finishMode = resolve; }));
    const screen = render(<WorkoutScreen />);
    await waitFor(() => expect(mockMode).toHaveBeenCalled());
    fireEvent.press(screen.getByRole('button', { name: '返回首頁' }));
    screen.unmount();
    await act(async () => { finishMode(); });
    await waitFor(() => expect(mockActive).toBe(false));
    expect(mockPlayers.some((player) => !player.removed || player.playing)).toBe(false);
  });

  it('完整訓練保存後返回首頁，再進入仍可播放音樂', async () => {
    const first = render(<WorkoutScreen />);
    await waitFor(() => expect(mockPlayers.some((player) => player.loop && player.playing)).toBe(true));
    jest.useFakeTimers();
    try {
      fireEvent.press(first.getByRole('button', { name: '開始' }));
      await act(async () => { jest.advanceTimersByTime(113500); });
      expect(first.getByText('訓練完成')).toBeTruthy();
      const buttons = first.getAllByRole('button', { name: '返回首頁' });
      fireEvent.press(buttons[buttons.length - 1]);
      expect(mockDismissTo).toHaveBeenCalled();
      first.unmount();
      await act(async () => {});
    } finally {
      first.unmount();
      jest.useRealTimers();
    }
    const next = render(<WorkoutScreen />);
    await waitFor(() => expect(mockPlayers.filter((player) => player.loop && player.playing)).toHaveLength(1));
    expect(mockPlayers.filter((player) => !player.removed)).toHaveLength(9);
    next.unmount();
    await act(async () => {});
  });

  it('偏好讀取失敗維持靜音且仍可開始計時', async () => {
    mockDb.getFirstAsync.mockRejectedValueOnce(new Error('read failed'));
    const screen = render(<WorkoutScreen />);
    await act(async () => {});
    expect(mockPlayers).toHaveLength(0);
    expect(mockMode).not.toHaveBeenCalled();
    fireEvent.press(screen.getByRole('button', { name: '開始' }));
    expect(screen.getByText('準備')).toBeTruthy();
    screen.unmount();
    await act(async () => {});
  });

  it.each([1, 0])('安全暫停回前景保持暫停，手動繼續恢復啟用的音訊（music=%s）', async (music) => {
    mockDb.getFirstAsync.mockResolvedValue({ ...enabledRow, music_enabled: music });
    let onAppState!: (state: AppStateStatus) => void;
    const subscription = jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => {
      onAppState = listener;
      return { remove: jest.fn() };
    });
    const screen = render(<WorkoutScreen />);
    try {
      await waitFor(() => expect(mockPlayers).toHaveLength(music ? 9 : 8));
      await act(async () => {});
      jest.useFakeTimers();
      fireEvent.press(screen.getByRole('button', { name: '開始' }));
      await act(async () => { onAppState('background'); });
      expect(screen.getByRole('button', { name: '繼續' })).toBeTruthy();
      expect(mockActive).toBe(false);
      expect(mockPlayers.some((player) => player.playing)).toBe(false);

      await act(async () => { onAppState('active'); });
      expect(screen.getByRole('button', { name: '繼續' })).toBeTruthy();
      expect(mockPlayers.some((player) => player.playing)).toBe(false);

      await act(async () => { fireEvent.press(screen.getByRole('button', { name: '繼續' })); });
      expect(mockActive).toBe(music === 1);
      expect(mockPlayers.some((player) => player.loop && player.playing)).toBe(music === 1);
      await act(async () => { jest.advanceTimersByTime(3500); });
      expect(mockActive).toBe(true);
      expect(mockPlayers.some((player) => !player.loop && player.playing)).toBe(true);
    } finally {
      screen.unmount();
      await act(async () => {});
      jest.useRealTimers();
      subscription.mockRestore();
    }
  });

  it('不記錄訓練開始時仍保存參數，不寫入完成紀錄', async () => {
    mockRouteParams = { mode: 'unrecorded' };
    const appStateSubscription = jest.spyOn(AppState, 'addEventListener').mockImplementation(() => ({
      remove: jest.fn(),
    }));
    const screen = render(<WorkoutScreen />);
    await waitFor(() => expect(mockPlayers).toHaveLength(9));
    jest.useFakeTimers();
    try {
      fireEvent.press(screen.getByRole('button', { name: '開始' }));
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE workout_preferences'),
        [20, 10, 4]
      );

      await act(async () => { jest.advanceTimersByTime(113500); });
      expect(screen.getByText('訓練完成')).toBeTruthy();
      const completionQueries = mockDb.runAsync.mock.calls
        .map(([query]) => query as string)
        .filter((query) => query.includes('daily_completions') || query.includes('rest_days'));
      expect(completionQueries).toHaveLength(0);
    } finally {
      screen.unmount();
      await act(async () => {});
      jest.useRealTimers();
      appStateSubscription.mockRestore();
    }
  });
});
