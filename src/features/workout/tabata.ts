export interface TabataStage {
  type: 'work' | 'rest';
  round: number;
  durationSeconds: number;
}

export const TABATA_STAGES: TabataStage[] = [
  { type: 'work', round: 1, durationSeconds: 20 },
  { type: 'rest', round: 1, durationSeconds: 10 },
  { type: 'work', round: 2, durationSeconds: 20 },
  { type: 'rest', round: 2, durationSeconds: 10 },
  { type: 'work', round: 3, durationSeconds: 20 },
  { type: 'rest', round: 3, durationSeconds: 10 },
  { type: 'work', round: 4, durationSeconds: 20 },
];

export const PREPARE_DURATION_MS = 3_000;
export const TOTAL_WORKOUT_DURATION_MS = 110_000;
export const TOTAL_FLOW_DURATION_MS = PREPARE_DURATION_MS + TOTAL_WORKOUT_DURATION_MS;

export type TabataPhase = 'preparing' | 'running' | 'completed';

export interface TabataSnapshot {
  phase: TabataPhase;
  round: number;
  stageIndex: number;
  stageType: 'work' | 'rest';
  remainingSeconds: number;
  elapsedWorkoutMs: number;
  isFinished: boolean;
}

export type VoicePromptKey =
  | 'prepare'
  | 'work_1'
  | 'rest_1'
  | 'work_2'
  | 'rest_2'
  | 'work_3'
  | 'rest_3'
  | 'work_4'
  | 'completed';

export type SoundCueKey =
  | 'prepare_countdown'
  | 'warning_5s'
  | 'countdown'
  | 'completion';

export function deriveTabataSnapshot(elapsedTotalMs: number): TabataSnapshot {
  if (elapsedTotalMs < PREPARE_DURATION_MS) {
    const remainingMs = PREPARE_DURATION_MS - elapsedTotalMs;
    const remainingSeconds = Math.max(1, Math.min(3, Math.ceil(remainingMs / 1000)));
    return {
      phase: 'preparing',
      round: 1,
      stageIndex: 0,
      stageType: 'work',
      remainingSeconds,
      elapsedWorkoutMs: 0,
      isFinished: false,
    };
  }

  const elapsedWorkoutMs = elapsedTotalMs - PREPARE_DURATION_MS;
  if (elapsedWorkoutMs >= TOTAL_WORKOUT_DURATION_MS) {
    return {
      phase: 'completed',
      round: 4,
      stageIndex: 6,
      stageType: 'work',
      remainingSeconds: 0,
      elapsedWorkoutMs: TOTAL_WORKOUT_DURATION_MS,
      isFinished: true,
    };
  }

  let accumulatedMs = 0;
  for (let i = 0; i < TABATA_STAGES.length; i++) {
    const stage = TABATA_STAGES[i];
    const stageDurationMs = stage.durationSeconds * 1000;
    if (elapsedWorkoutMs < accumulatedMs + stageDurationMs) {
      const stageRemainingMs = accumulatedMs + stageDurationMs - elapsedWorkoutMs;
      const remainingSeconds = Math.max(1, Math.min(stage.durationSeconds, Math.ceil(stageRemainingMs / 1000)));
      return {
        phase: 'running',
        round: stage.round,
        stageIndex: i,
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
    round: 4,
    stageIndex: 6,
    stageType: 'work',
    remainingSeconds: 0,
    elapsedWorkoutMs: TOTAL_WORKOUT_DURATION_MS,
    isFinished: true,
  };
}

interface ScheduledEvent<T> {
  timeMs: number;
  event: T;
}

const SCHEDULED_VOICES: ScheduledEvent<VoicePromptKey>[] = [
  { timeMs: 0, event: 'prepare' },
  { timeMs: 3_000, event: 'work_1' },
  { timeMs: 23_000, event: 'rest_1' },
  { timeMs: 33_000, event: 'work_2' },
  { timeMs: 53_000, event: 'rest_2' },
  { timeMs: 63_000, event: 'work_3' },
  { timeMs: 83_000, event: 'rest_3' },
  { timeMs: 93_000, event: 'work_4' },
  { timeMs: 113_000, event: 'completed' },
];

function buildScheduledCues(): ScheduledEvent<SoundCueKey>[] {
  const cues: ScheduledEvent<SoundCueKey>[] = [
    { timeMs: 0, event: 'prepare_countdown' },
    { timeMs: 1_000, event: 'prepare_countdown' },
    { timeMs: 2_000, event: 'prepare_countdown' },
  ];

  let currentStartMs = PREPARE_DURATION_MS;
  for (const stage of TABATA_STAGES) {
    const duration = stage.durationSeconds;
    // 5s warning
    cues.push({ timeMs: currentStartMs + (duration - 5) * 1000, event: 'warning_5s' });
    // 3, 2, 1 countdown
    cues.push({ timeMs: currentStartMs + (duration - 3) * 1000, event: 'countdown' });
    cues.push({ timeMs: currentStartMs + (duration - 2) * 1000, event: 'countdown' });
    cues.push({ timeMs: currentStartMs + (duration - 1) * 1000, event: 'countdown' });

    currentStartMs += duration * 1000;
  }

  // Completion chime
  cues.push({ timeMs: TOTAL_FLOW_DURATION_MS, event: 'completion' });
  return cues;
}

const SCHEDULED_CUES = buildScheduledCues();

export interface TabataEventsResult {
  voices: VoicePromptKey[];
  cues: SoundCueKey[];
}

export function getTabataEvents(fromMs: number, toMs: number): TabataEventsResult {
  const isIncluded = (t: number) => {
    if (fromMs === 0 && t === 0) return true;
    return t > fromMs && t <= toMs;
  };

  const voices = SCHEDULED_VOICES.filter((item) => isIncluded(item.timeMs)).map((item) => item.event);
  const cues = SCHEDULED_CUES.filter((item) => isIncluded(item.timeMs)).map((item) => item.event);

  return { voices, cues };
}
