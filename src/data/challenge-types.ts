export type ChallengeDuration = 7 | 14 | 30;
export type RestQuota = 1 | 2 | 3;

export interface Challenge {
  id: number;
  start_date: string;
  duration_days: ChallengeDuration;
  rest_quota: RestQuota;
  settled_at: string | null;
}

export interface RestDay {
  local_date: string;
  challenge_id: number;
  created_at: string;
}

export interface ChallengeSummary {
  challenge: Challenge;
  startDate: string;
  endDate: string;
  remainingDays: number;
  remainingRestQuota: number;
  isEnded: boolean;
  isSettled: boolean;
}

export type DailyRecordState = 'completed' | 'rest' | 'pending' | 'unrecorded';

export type SettlementOutcome = 'completed' | 'uncompleted';
