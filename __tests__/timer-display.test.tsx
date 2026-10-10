import { render } from '@testing-library/react-native';
import { TimerDisplay } from '../src/features/workout/components/timer-display';
import type { TabataSnapshot } from '../src/features/workout/tabata';

describe('TimerDisplay Component (Seam 4)', () => {
  it('preparing 狀態顯示「準備」與倒數秒數', () => {
    const snapshot: TabataSnapshot = {
      phase: 'preparing',
      round: 1,
      totalRounds: 4,
      stageIndex: 0,
      stageType: 'work',
      remainingSeconds: 3,
      elapsedWorkoutMs: 0,
      isFinished: false,
    };

    const { getByText } = render(
      <TimerDisplay status="preparing" snapshot={snapshot} />
    );

    expect(getByText('準備')).toBeTruthy();
    expect(getByText('3')).toBeTruthy();
  });

  it('running 狀態顯示組數、階段與剩餘秒數', () => {
    const snapshot: TabataSnapshot = {
      phase: 'running',
      round: 2,
      totalRounds: 7,
      stageIndex: 2,
      stageType: 'work',
      remainingSeconds: 15,
      elapsedWorkoutMs: 35000,
      isFinished: false,
    };

    const { getByText } = render(
      <TimerDisplay status="running" snapshot={snapshot} />
    );

    expect(getByText('第 2 / 7 組')).toBeTruthy();
    expect(getByText('運動')).toBeTruthy();
    expect(getByText('15')).toBeTruthy();
  });

  it('paused 狀態保留目前進度，不顯示「已暫停」標籤', () => {
    const snapshot: TabataSnapshot = {
      phase: 'running',
      round: 1,
      totalRounds: 1,
      stageIndex: 1,
      stageType: 'rest',
      remainingSeconds: 8,
      elapsedWorkoutMs: 22000,
      isFinished: false,
    };

    const { getByText, queryByText } = render(
      <TimerDisplay status="paused" snapshot={snapshot} />
    );

    expect(queryByText('已暫停')).toBeNull();
    expect(getByText('第 1 / 1 組')).toBeTruthy();
    expect(getByText('休息')).toBeTruthy();
    expect(getByText('8')).toBeTruthy();
  });
});
