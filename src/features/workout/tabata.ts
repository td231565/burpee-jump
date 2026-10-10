export interface WorkoutParameters {
  workSeconds: number;
  restSeconds: number;
  rounds: number;
}

export const DEFAULT_WORKOUT_PARAMETERS: WorkoutParameters = {
  workSeconds: 20,
  restSeconds: 10,
  rounds: 4,
};

export interface TabataStage {
  type: 'work' | 'rest';
  round: number;
  durationSeconds: number;
}

export const PREPARE_DURATION_MS = 3_000;

export type TabataPhase = 'preparing' | 'running' | 'completed';

export interface TabataSnapshot {
  phase: TabataPhase;
  round: number;
  totalRounds: number;
  stageIndex: number;
  stageType: 'work' | 'rest';
  remainingSeconds: number;
  elapsedWorkoutMs: number;
  isFinished: boolean;
}

export type VoicePromptKey = 'prepare' | 'work_first_start' | 'work_start' | 'rest' | 'completed';

// WAV frame counts / 44.1 kHz; keep these in sync when replacing the start clips.
export const WORK_START_VOICE_DURATION_MS = {
  work_first_start: 572.290,
  work_start: 1_248.254,
} as const;

export type SoundCueKey =
  | 'prepare_countdown'
  | 'stage_countdown'
  | 'completion';

export interface ScheduledTabataEvent<T> {
  timeMs: number;
  event: T;
}

export interface TabataPlan {
  parameters: WorkoutParameters;
  stages: TabataStage[];
  totalWorkoutDurationMs: number;
  totalFlowDurationMs: number;
  voiceSchedule: ScheduledTabataEvent<VoicePromptKey>[];
  cueSchedule: ScheduledTabataEvent<SoundCueKey>[];
}

export function createTabataPlan(parameters: WorkoutParameters): TabataPlan {
  const stages: TabataStage[] = [];
  for (let round = 1; round <= parameters.rounds; round += 1) {
    stages.push({ type: 'work', round, durationSeconds: parameters.workSeconds });
    if (round < parameters.rounds) {
      stages.push({ type: 'rest', round, durationSeconds: parameters.restSeconds });
    }
  }

  const totalWorkoutDurationMs = stages.reduce(
    (total, stage) => total + stage.durationSeconds * 1000,
    0,
  );
  const totalFlowDurationMs = PREPARE_DURATION_MS + totalWorkoutDurationMs;
  const voiceSchedule: ScheduledTabataEvent<VoicePromptKey>[] = [
    { timeMs: 0, event: 'prepare' },
  ];
  const cueSchedule: ScheduledTabataEvent<SoundCueKey>[] = [
    { timeMs: 0, event: 'prepare_countdown' },
    { timeMs: 1_000, event: 'prepare_countdown' },
    { timeMs: 2_000, event: 'prepare_countdown' },
  ];

  let stageStartMs = PREPARE_DURATION_MS;
  for (const stage of stages) {
    const voice = stage.type === 'rest' ? 'rest' : stage.round === 1 ? 'work_first_start' : 'work_start';
    voiceSchedule.push({
      timeMs: stageStartMs - (voice === 'rest' ? 0 : WORK_START_VOICE_DURATION_MS[voice]),
      event: voice,
    });

    for (let remaining = 5; remaining >= 1; remaining -= 1) {
      cueSchedule.push({
        timeMs: stageStartMs + (stage.durationSeconds - remaining) * 1000,
        event: 'stage_countdown',
      });
    }

    stageStartMs += stage.durationSeconds * 1000;
  }

  voiceSchedule.push({ timeMs: totalFlowDurationMs, event: 'completed' });
  cueSchedule.push({ timeMs: totalFlowDurationMs, event: 'completion' });

  return {
    parameters: { ...parameters },
    stages,
    totalWorkoutDurationMs,
    totalFlowDurationMs,
    voiceSchedule,
    cueSchedule,
  };
}

const DEFAULT_TABATA_PLAN = createTabataPlan(DEFAULT_WORKOUT_PARAMETERS);

// Keep the original constants available to existing default-flow consumers.
export const TABATA_STAGES = DEFAULT_TABATA_PLAN.stages;
export const TOTAL_WORKOUT_DURATION_MS = DEFAULT_TABATA_PLAN.totalWorkoutDurationMs;
export const TOTAL_FLOW_DURATION_MS = DEFAULT_TABATA_PLAN.totalFlowDurationMs;

export function deriveTabataSnapshot(
  elapsedTotalMs: number,
  plan: TabataPlan = DEFAULT_TABATA_PLAN,
): TabataSnapshot {
  const totalRounds = plan.parameters.rounds;
  const finalStageIndex = plan.stages.length - 1;

  if (elapsedTotalMs < PREPARE_DURATION_MS) {
    const remainingMs = PREPARE_DURATION_MS - elapsedTotalMs;
    const remainingSeconds = Math.max(1, Math.min(3, Math.ceil(remainingMs / 1000)));
    return {
      phase: 'preparing',
      round: 1,
      totalRounds,
      stageIndex: 0,
      stageType: 'work',
      remainingSeconds,
      elapsedWorkoutMs: 0,
      isFinished: false,
    };
  }

  const elapsedWorkoutMs = elapsedTotalMs - PREPARE_DURATION_MS;
  if (elapsedWorkoutMs >= plan.totalWorkoutDurationMs) {
    return {
      phase: 'completed',
      round: totalRounds,
      totalRounds,
      stageIndex: finalStageIndex,
      stageType: 'work',
      remainingSeconds: 0,
      elapsedWorkoutMs: plan.totalWorkoutDurationMs,
      isFinished: true,
    };
  }

  let accumulatedMs = 0;
  for (let index = 0; index < plan.stages.length; index += 1) {
    const stage = plan.stages[index];
    const stageDurationMs = stage.durationSeconds * 1000;
    if (elapsedWorkoutMs < accumulatedMs + stageDurationMs) {
      const stageRemainingMs = accumulatedMs + stageDurationMs - elapsedWorkoutMs;
      const remainingSeconds = Math.max(
        1,
        Math.min(stage.durationSeconds, Math.ceil(stageRemainingMs / 1000)),
      );
      return {
        phase: 'running',
        round: stage.round,
        totalRounds,
        stageIndex: index,
        stageType: stage.type,
        remainingSeconds,
        elapsedWorkoutMs,
        isFinished: false,
      };
    }
    accumulatedMs += stageDurationMs;
  }

  return {
    phase: 'completed',
    round: totalRounds,
    totalRounds,
    stageIndex: finalStageIndex,
    stageType: 'work',
    remainingSeconds: 0,
    elapsedWorkoutMs: plan.totalWorkoutDurationMs,
    isFinished: true,
  };
}

export interface TabataEventsResult {
  voices: VoicePromptKey[];
  cues: SoundCueKey[];
}

export function getTabataEvents(
  fromMs: number,
  toMs: number,
  plan: TabataPlan = DEFAULT_TABATA_PLAN,
): TabataEventsResult {
  const isIncluded = (timeMs: number) => {
    if (fromMs === 0 && timeMs === 0) return true;
    return timeMs > fromMs && timeMs <= toMs;
  };

  return {
    voices: plan.voiceSchedule.filter((item) => isIncluded(item.timeMs)).map((item) => item.event),
    cues: plan.cueSchedule.filter((item) => isIncluded(item.timeMs)).map((item) => item.event),
  };
}
