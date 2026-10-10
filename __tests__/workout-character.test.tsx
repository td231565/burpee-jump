import React from 'react';
import { render, fireEvent, act, screen } from '@testing-library/react-native';
import { Vibration } from 'react-native';
import { WorkoutCompanion } from '../src/features/workout/components/workout-companion';
import { CelebrationDisplay } from '../src/features/workout/components/celebration-display';
import { PixelCharacter } from '../src/features/workout/components/pixel-character';
import { triggerCompletionVibration } from '../src/features/workout/vibration';
import WorkoutScreen from '../src/app/workout';

// Mock router
const mockBack = jest.fn();
const mockDismissTo = jest.fn();
let mockSearchParams: Record<string, string> = {};

jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: mockBack,
    dismissTo: mockDismissTo,
  }),
  useLocalSearchParams: () => mockSearchParams,
}));

// Mock sqlite
const mockRunAsync = jest.fn();
const mockGetFirstAsync = jest.fn();
const mockDb = {
  getFirstAsync: (...args: any[]) => mockGetFirstAsync(...args),
  runAsync: (...args: any[]) => mockRunAsync(...args),
};
jest.mock('expo-sqlite', () => ({ useSQLiteContext: () => mockDb }));

// Mock keep-awake
jest.mock('expo-keep-awake', () => ({
  activateKeepAwakeAsync: jest.fn().mockResolvedValue(undefined),
  deactivateKeepAwake: jest.fn(),
}));

// Mock audio-service
jest.mock('../src/features/workout/audio-service', () => ({
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
}));

describe('Pre-Phase 3 訓練中動畫與完成回饋', () => {
  const waitForWorkoutSettings = async () => {
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByRole('button', { name: '開始' }).props.accessibilityState?.disabled).toBe(false);
  };

  beforeEach(() => {
    jest.useFakeTimers({
      doNotFake: ['setTimeout', 'setImmediate'],
    });
    if (jest.isMockFunction(Vibration.vibrate)) {
      (Vibration.vibrate as jest.Mock).mockClear();
    } else {
      jest.spyOn(Vibration, 'vibrate').mockImplementation(jest.fn());
    }
    mockBack.mockClear();
    mockDismissTo.mockClear();
    mockRunAsync.mockClear();
    mockSearchParams = {};
    mockGetFirstAsync.mockImplementation((sql: string) => Promise.resolve(
      sql.includes('workout_preferences')
        ? { work_seconds: 20, rest_seconds: 10, rounds: 4 }
        : { voice_enabled: 1, cues_enabled: 1, music_enabled: 0 }
    ));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  describe('PixelCharacter 純向量渲染', () => {
    it('能正確渲染所有 7 種關鍵姿勢且不對無障礙樹暴露裝飾元素', () => {
      const frames = ['idle', 'squat', 'plank', 'tuck', 'jump', 'rest', 'celebrate'] as const;
      for (const frame of frames) {
        const { UNSAFE_getByType } = render(<PixelCharacter frame={frame} />);
        const svg = UNSAFE_getByType('RNSVGSvgView' as any);
        expect(svg.props.accessible).toBe(false);
      }
    });
  });

  describe('WorkoutCompanion 訓練陪伴小人控制器', () => {
    it('在 ready、preparing、saving、saveError 與 paused 狀態均顯示靜態 idle', () => {
      const staticStatuses = ['ready', 'preparing', 'saving', 'saveError', 'paused'] as const;
      for (const status of staticStatuses) {
        const { UNSAFE_getByType } = render(
          <WorkoutCompanion status={status} stageType="work" />
        );
        const svg = UNSAFE_getByType('RNSVGSvgView' as any);
        expect(svg).toBeTruthy();
      }
    });

    it('在運動階段循環播放波比跳 5 幀動作（每幀 500ms，循環 2.5 秒）', () => {
      const { UNSAFE_getByType } = render(
        <WorkoutCompanion status="running" stageType="work" />
      );

      // 初期是第 0 幀 (idle)
      expect(UNSAFE_getByType('RNSVGSvgView' as any)).toBeTruthy();

      // 快轉 500ms 進入第 1 幀 (squat)
      act(() => {
        jest.advanceTimersByTime(500);
      });
      expect(UNSAFE_getByType('RNSVGSvgView' as any)).toBeTruthy();

      // 快轉 500ms 進入第 2 幀 (plank)
      act(() => {
        jest.advanceTimersByTime(500);
      });
      expect(UNSAFE_getByType('RNSVGSvgView' as any)).toBeTruthy();

      // 快轉 500ms 進入第 3 幀 (tuck)
      act(() => {
        jest.advanceTimersByTime(500);
      });
      expect(UNSAFE_getByType('RNSVGSvgView' as any)).toBeTruthy();

      // 快轉 500ms 進入第 4 幀 (jump)
      act(() => {
        jest.advanceTimersByTime(500);
      });
      expect(UNSAFE_getByType('RNSVGSvgView' as any)).toBeTruthy();

      // 快轉 500ms 循環回第 0 幀 (idle)
      act(() => {
        jest.advanceTimersByTime(500);
      });
      expect(UNSAFE_getByType('RNSVGSvgView' as any)).toBeTruthy();
    });

    it('在休息階段只進行微幅起伏呼吸循環，不進行波比跳（每幀 800ms，循環 1.6 秒）', () => {
      const { UNSAFE_getByType } = render(
        <WorkoutCompanion status="running" stageType="rest" />
      );

      // 休息初始為 idle
      expect(UNSAFE_getByType('RNSVGSvgView' as any)).toBeTruthy();

      // 800ms 後切換至 rest (起伏幀)
      act(() => {
        jest.advanceTimersByTime(800);
      });
      expect(UNSAFE_getByType('RNSVGSvgView' as any)).toBeTruthy();

      // 再過 800ms 切回 idle
      act(() => {
        jest.advanceTimersByTime(800);
      });
      expect(UNSAFE_getByType('RNSVGSvgView' as any)).toBeTruthy();
    });

    it('當 reduceMotion 為 true 時，正式運動與休息仍播放循環動作（訓練陪伴角色為例外）', () => {
      const { UNSAFE_getByType, rerender } = render(
        <WorkoutCompanion status="running" stageType="work" reduceMotion={true} />
      );

      act(() => {
        jest.advanceTimersByTime(500);
      });
      expect(UNSAFE_getByType('RNSVGSvgView' as any)).toBeTruthy();

      rerender(<WorkoutCompanion status="running" stageType="rest" reduceMotion={true} />);
      act(() => {
        jest.advanceTimersByTime(800);
      });
      expect(UNSAFE_getByType('RNSVGSvgView' as any)).toBeTruthy();
    });

    it('暫停後繼續時，角色從目前階段動畫起點（站姿）重播', () => {
      const { UNSAFE_getByType, rerender } = render(
        <WorkoutCompanion status="running" stageType="work" />
      );

      act(() => {
        jest.advanceTimersByTime(500);
      });

      // 暫停：應維持靜態
      rerender(<WorkoutCompanion status="paused" stageType="work" />);
      expect(UNSAFE_getByType('RNSVGSvgView' as any)).toBeTruthy();

      // 繼續：從起點重播
      rerender(<WorkoutCompanion status="running" stageType="work" />);
      expect(UNSAFE_getByType('RNSVGSvgView' as any)).toBeTruthy();
    });
  });

  describe('CelebrationDisplay 完成展示與日出元件', () => {
    it('渲染低對比日出背景與慶祝小人，且返回按鈕等交互不需等待動效結束', () => {
      const { UNSAFE_getByType } = render(<CelebrationDisplay />);
      const svg = UNSAFE_getByType('RNSVGSvgView' as any);
      expect(svg).toBeTruthy();
      expect(svg.props.accessible).toBe(false);

      // 動畫 1000ms 播放一次
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(svg).toBeTruthy();
    });

    it('支援 reduceMotion，開啟時直接顯示靜態完成狀態', () => {
      const { UNSAFE_getByType } = render(<CelebrationDisplay reduceMotion={true} />);
      const svg = UNSAFE_getByType('RNSVGSvgView' as any);
      expect(svg).toBeTruthy();
    });
  });

  describe('震動回饋與完成整合契約 (WorkoutScreen)', () => {
    it('triggerCompletionVibration 在不同平台觸發震動且在例外時不崩潰', () => {
      triggerCompletionVibration();
      expect(Vibration.vibrate).toHaveBeenCalled();

      // 模擬 Vibration 拋錯
      (Vibration.vibrate as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Device not supported');
      });
      expect(() => triggerCompletionVibration()).not.toThrow();
    });

    it('一般訓練：保存成功後觸發一次震動與完成畫面；保存中與保存失敗不觸發震動', async () => {
      mockRunAsync.mockResolvedValue({ lastInsertRowId: 1, changes: 1 });

      const { getByRole, getByText } = render(<WorkoutScreen />);
      await waitForWorkoutSettings();

      expect(Vibration.vibrate).not.toHaveBeenCalled();

      fireEvent.press(getByRole('button', { name: '開始' }));

      // 運動中不觸發完成震動
      act(() => {
        jest.advanceTimersByTime(50000);
      });
      expect(Vibration.vibrate).not.toHaveBeenCalled();

      // 快轉至訓練結束並保存
      act(() => {
        jest.advanceTimersByTime(65000);
      });

      await new Promise((resolve) => setTimeout(resolve, 150));

      // 儲存成功進入 completed，觸發一次完成震動
      expect(Vibration.vibrate).toHaveBeenCalledTimes(1);
      expect(getByText('訓練完成')).toBeTruthy();
      expect(getByText('本日波比跳訓練已完成')).toBeTruthy();
    });

    it('保存失敗時停在待重試狀態且不觸發震動；手動重試成功後才觸發一次震動', async () => {
      let shouldFailFirstCompletion = true;
      mockRunAsync.mockImplementation((sql: string) => {
        if (shouldFailFirstCompletion && sql.includes('INSERT INTO daily_completions')) {
          shouldFailFirstCompletion = false;
          return Promise.reject(new Error('Write failed'));
        }
        return Promise.resolve({ lastInsertRowId: 1, changes: 1 });
      });

      const { getByRole, getByText, queryByText } = render(<WorkoutScreen />);
      await waitForWorkoutSettings();

      fireEvent.press(getByRole('button', { name: '開始' }));

      act(() => {
        jest.advanceTimersByTime(113500);
      });

      await new Promise((resolve) => setTimeout(resolve, 150));

      // 保存失敗：不觸發震動，不誤報已完成
      expect(Vibration.vibrate).not.toHaveBeenCalled();
      expect(getByText('儲存失敗')).toBeTruthy();
      expect(queryByText('訓練完成')).toBeNull();

      // 點擊重新儲存
      fireEvent.press(getByRole('button', { name: '重新儲存' }));

      await new Promise((resolve) => setTimeout(resolve, 150));

      // 重試成功，觸發一次震動
      expect(Vibration.vibrate).toHaveBeenCalledTimes(1);
      expect(getByText('訓練完成')).toBeTruthy();
    });

    it('不記錄訓練（再做一次）：計時結束後顯示訓練完成並觸發一次震動，不寫入完成紀錄', async () => {
      mockSearchParams = { mode: 'unrecorded' };

      const { getByRole, getByText, queryByText } = render(<WorkoutScreen />);
      await waitForWorkoutSettings();

      fireEvent.press(getByRole('button', { name: '開始' }));

      act(() => {
        jest.advanceTimersByTime(113500);
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockRunAsync).not.toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO daily_completions'),
        expect.anything()
      );
      expect(Vibration.vibrate).toHaveBeenCalledTimes(1);
      expect(getByText('訓練完成')).toBeTruthy();
      expect(queryByText('本次訓練已完成')).toBeNull();
      expect(queryByText('已記錄')).toBeNull();
    });
  });
});
