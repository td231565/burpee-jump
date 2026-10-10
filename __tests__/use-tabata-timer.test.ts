import { renderHook, act } from '@testing-library/react-native';
import { useTabataTimer } from '../src/features/workout/use-tabata-timer';
import type { WorkoutParameters } from '../src/features/workout/tabata';
import type { AudioPreferences } from '../src/data/audio-preferences';

// Mock expo-keep-awake
const mockActivateKeepAwake = jest.fn();
const mockDeactivateKeepAwake = jest.fn();
const mockPlayVoice = jest.fn();
const mockPlayCue = jest.fn();
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
      playVoice: (...args: unknown[]) => mockPlayVoice(...args),
      playCue: (...args: unknown[]) => mockPlayCue(...args),
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

  it('午夜前按下「開始」但準備倒數跨日，仍使用按鈕當下日期；跨午夜完成仍歸屬於開始日', () => {
    // 設定系統時間為 2026-01-31 23:59:58 (離跨日剩 2 秒)
    jest.setSystemTime(new Date(2026, 0, 31, 23, 59, 58));

    const { result } = renderHook(() => useTabataTimer({ preferences: defaultPrefs }));

    act(() => {
      result.current.start();
    });

    // 鎖定日期為開始當下的當地日
    expect(result.current.lockedLocalDate).toBe('2026-01-31');

    // 快轉完整 113.5 秒 (時間進入 2026-02-01)
    act(() => {
      jest.advanceTimersByTime(113500);
    });

    expect(result.current.status).toBe('saving');
    // 完成紀錄的歸屬日仍為開始日 2026-01-31
    expect(result.current.saveRecord?.localDate).toBe('2026-01-31');
  });

  it('進入畫面後跨日才按下「開始」，使用按鈕當下的新當地日期', () => {
    // 進入畫面時為 2026-01-31 23:59:50
    jest.setSystemTime(new Date(2026, 0, 31, 23, 59, 50));

    const { result } = renderHook(() => useTabataTimer({ preferences: defaultPrefs }));

    // 停留在 ready 狀態，未按開始，時間前進 15 秒跨入 2026-02-01 00:00:05
    act(() => {
      jest.advanceTimersByTime(15000);
    });

    // 跨日後才按開始
    act(() => {
      result.current.start();
    });

    // 鎖定新日期 2026-02-01
    expect(result.current.lockedLocalDate).toBe('2026-02-01');
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

  it('完整 113 秒後進入 saving 狀態，呼叫 markSaveSuccess 後進入 completed', () => {
    const { result } = renderHook(() => useTabataTimer({ preferences: defaultPrefs }));

    act(() => {
      result.current.start();
    });

    // 快轉 113.5 秒
    act(() => {
      jest.advanceTimersByTime(113500);
    });

    expect(result.current.status).toBe('saving');
    expect(result.current.saveRecord?.localDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.current.snapshot.isFinished).toBe(true);
    expect(mockDeactivateKeepAwake).toHaveBeenCalled();

    act(() => {
      result.current.markSaveSuccess();
    });

    expect(result.current.status).toBe('completed');
  });

  it('開始時擷取自訂單組計畫，暫停與繼續沿用同一完成時點', () => {
    const parameters: WorkoutParameters = { workSeconds: 10, restSeconds: 6, rounds: 1 };
    const { result } = renderHook(() => useTabataTimer({ preferences: defaultPrefs }));

    act(() => {
      result.current.start(parameters);
    });
    act(() => {
      jest.advanceTimersByTime(8_000);
    });

    expect(result.current.snapshot).toMatchObject({ round: 1, totalRounds: 1, stageType: 'work' });
    expect(result.current.snapshot.remainingSeconds).toBe(5);

    act(() => {
      result.current.pause();
      jest.advanceTimersByTime(10_000);
    });
    expect(result.current.status).toBe('paused');

    act(() => {
      result.current.resume();
    });
    act(() => {
      jest.advanceTimersByTime(5_100);
    });

    expect(result.current.status).toBe('saving');
    expect(result.current.snapshot).toMatchObject({
      phase: 'completed', round: 1, totalRounds: 1, elapsedWorkoutMs: 10_000,
    });
  });

  it('起始提示只播放一次，暫停後跨過邊界繼續不重播該次組別語音', () => {
    const { result } = renderHook(() => useTabataTimer({ preferences: defaultPrefs }));

    act(() => {
      result.current.start();
    });
    expect(mockPlayVoice.mock.calls.filter(([key]) => key === 'prepare')).toHaveLength(1);
    expect(mockPlayCue.mock.calls.filter(([key]) => key === 'prepare_countdown')).toHaveLength(1);

    act(() => {
      jest.advanceTimersByTime(3_000);
    });
    expect(mockPlayVoice.mock.calls.filter(([key]) => key === 'work_first_start')).toHaveLength(1);
    expect(mockPlayVoice.mock.calls.filter(([key]) => key === 'work_start')).toHaveLength(0);

    act(() => {
      result.current.pause();
      jest.advanceTimersByTime(10_000);
      result.current.resume();
      jest.advanceTimersByTime(200);
    });
    expect(mockPlayVoice.mock.calls.filter(([key]) => key === 'work_first_start')).toHaveLength(1);
  });

  it('開始語音依音檔長度提前播放，結束時間對齊各組運動起點', () => {
    const startedAt = Date.now();
    const played: { key: string; elapsedMs: number }[] = [];
    mockPlayVoice.mockImplementation((key: string) => {
      played.push({ key, elapsedMs: Date.now() - startedAt });
    });
    const { result } = renderHook(() => useTabataTimer({ preferences: defaultPrefs }));
    act(() => { result.current.start(); });
    act(() => { jest.advanceTimersByTime(2_428); });
    const first = played.find(({ key }) => key === 'work_first_start');
    expect(first).toBeDefined();
    expect(first!.elapsedMs + 572.290).toBeCloseTo(3_000, 0);
    expect(result.current.status).toBe('preparing');
    act(() => { jest.advanceTimersByTime(572); });
    expect(result.current.status).toBe('running');
    act(() => { jest.advanceTimersByTime(28_752); });
    const second = played.find(({ key }) => key === 'work_start');
    expect(second).toBeDefined();
    expect(second!.elapsedMs + 1_248.254).toBeCloseTo(33_000, 0);
    expect(result.current.snapshot.stageType).toBe('rest');
    act(() => { jest.advanceTimersByTime(1_248); });
    expect(result.current.snapshot).toMatchObject({ stageType: 'work', round: 2 });
    expect(played.filter(({ key }) => key === 'work_first_start')).toHaveLength(1);
    expect(played.filter(({ key }) => key === 'work_start')).toHaveLength(1);
    mockPlayVoice.mockReset();
  });

  it('暫停時不播放預排開始語音，繼續後按剩餘準備時間播放且取消後不再播', () => {
    const { result } = renderHook(() => useTabataTimer({ preferences: defaultPrefs }));
    act(() => { result.current.start(); });
    act(() => { jest.advanceTimersByTime(1_000); result.current.pause(); });
    act(() => { jest.advanceTimersByTime(10_000); });
    expect(mockPlayVoice).not.toHaveBeenCalledWith('work_first_start');
    act(() => { result.current.resume(); });
    act(() => { jest.advanceTimersByTime(1_427); });
    expect(mockPlayVoice).not.toHaveBeenCalledWith('work_first_start');
    act(() => { jest.advanceTimersByTime(1); });
    expect(mockPlayVoice.mock.calls.filter(([key]) => key === 'work_first_start')).toHaveLength(1);
    act(() => { result.current.cancel(); });
    act(() => { jest.advanceTimersByTime(40_000); });
    expect(mockPlayVoice).not.toHaveBeenCalledWith('work_start');
  });

  describe('不記錄訓練 (recordCompletion: false)', () => {
    it('完整 113 秒後直接進入 completed，且 saveRecord 為 null', () => {
      const { result } = renderHook(() =>
        useTabataTimer({ preferences: defaultPrefs, recordCompletion: false })
      );

      act(() => {
        result.current.start();
      });

      expect(result.current.status).toBe('preparing');
      expect(result.current.lockedLocalDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      // 快轉 113.5 秒
      act(() => {
        jest.advanceTimersByTime(113500);
      });

      // 直接進入 completed，不經過 saving，saveRecord 為 null
      expect(result.current.status).toBe('completed');
      expect(result.current.saveRecord).toBeNull();
      expect(result.current.snapshot.isFinished).toBe(true);
      expect(mockDeactivateKeepAwake).toHaveBeenCalled();
    });

    it('暫停、繼續與取消行為與一般模式一致', () => {
      const { result } = renderHook(() =>
        useTabataTimer({ preferences: defaultPrefs, recordCompletion: false })
      );

      act(() => {
        result.current.start();
      });

      // 快轉到運動階段
      act(() => {
        jest.advanceTimersByTime(8000);
      });
      expect(result.current.status).toBe('running');

      // 暫停
      act(() => {
        result.current.pause();
      });
      expect(result.current.status).toBe('paused');

      // 繼續
      act(() => {
        result.current.resume();
      });
      expect(result.current.status).toBe('running');

      // 取消
      act(() => {
        result.current.cancel();
      });
      expect(result.current.status).toBe('cancelled');
      expect(result.current.saveRecord).toBeNull();
    });
  });
});
