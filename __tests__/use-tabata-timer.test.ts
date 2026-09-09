import { renderHook, act } from '@testing-library/react-native';
import { useTabataTimer } from '../src/features/workout/use-tabata-timer';
import type { AudioPreferences } from '../src/data/audio-preferences';

// Mock expo-keep-awake
const mockActivateKeepAwake = jest.fn();
const mockDeactivateKeepAwake = jest.fn();
jest.mock('expo-keep-awake', () => ({
  activateKeepAwakeAsync: () => mockActivateKeepAwake(),
  deactivateKeepAwake: () => mockDeactivateKeepAwake(),
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

describe('useTabataTimer Hook (Seam 2 & 4)', () => {
  const defaultPrefs: AudioPreferences = {
    voice_enabled: true,
    cues_enabled: true,
    music_enabled: false,
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('初始狀態為 ready，尚未鎖定 localDate', () => {
    const { result } = renderHook(() => useTabataTimer({ preferences: defaultPrefs }));

    expect(result.current.status).toBe('ready');
    expect(result.current.lockedLocalDate).toBeNull();
    expect(result.current.snapshot.phase).toBe('preparing');
    expect(result.current.snapshot.remainingSeconds).toBe(3);
  });

  it('按下開始後鎖定 localDate 並進入 preparing 狀態', () => {
    const { result } = renderHook(() => useTabataTimer({ preferences: defaultPrefs }));

    act(() => {
      result.current.start();
    });

    expect(result.current.status).toBe('preparing');
    expect(result.current.lockedLocalDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(mockActivateKeepAwake).toHaveBeenCalled();
  });

  it('在 ready 或 preparing 狀態取消不需確認，直接進入 cancelled', () => {
    const { result } = renderHook(() => useTabataTimer({ preferences: defaultPrefs }));

    act(() => {
      result.current.start(); // preparing
    });
    expect(result.current.status).toBe('preparing');

    act(() => {
      result.current.cancel();
    });

    expect(result.current.status).toBe('cancelled');
    expect(mockDeactivateKeepAwake).toHaveBeenCalled();
  });

  it('3 秒準備結束後自動進入 running 階段', () => {
    const { result } = renderHook(() => useTabataTimer({ preferences: defaultPrefs }));

    act(() => {
      result.current.start();
    });

    // 快轉 3.2 秒
    act(() => {
      jest.advanceTimersByTime(3200);
    });

    expect(result.current.status).toBe('running');
    expect(result.current.snapshot.round).toBe(1);
    expect(result.current.snapshot.stageType).toBe('work');
  });

  it('支援手動暫停與繼續，暫停期間累計時間不前進', () => {
    const { result } = renderHook(() => useTabataTimer({ preferences: defaultPrefs }));

    act(() => {
      result.current.start();
    });

    // 準備 3 秒 + 運動 5 秒 = 8 秒
    act(() => {
      jest.advanceTimersByTime(8000);
    });

    expect(result.current.status).toBe('running');
    const remainingBeforePause = result.current.snapshot.remainingSeconds;

    // 手動暫停
    act(() => {
      result.current.pause();
    });
    expect(result.current.status).toBe('paused');
    expect(mockDeactivateKeepAwake).toHaveBeenCalled();

    // 經過 10 秒
    act(() => {
      jest.advanceTimersByTime(10000);
    });
    expect(result.current.snapshot.remainingSeconds).toBe(remainingBeforePause);

    // 繼續
    act(() => {
      result.current.resume();
    });
    expect(result.current.status).toBe('running');
    expect(mockActivateKeepAwake).toHaveBeenCalled();
  });

  it('完整 113 秒後進入 completed 狀態', () => {
    const { result } = renderHook(() => useTabataTimer({ preferences: defaultPrefs }));

    act(() => {
      result.current.start();
    });

    // 快轉 113.5 秒
    act(() => {
      jest.advanceTimersByTime(113500);
    });

    expect(result.current.status).toBe('completed');
    expect(result.current.snapshot.isFinished).toBe(true);
    expect(mockDeactivateKeepAwake).toHaveBeenCalled();
  });
});
