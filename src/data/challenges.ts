import type { SQLiteDatabase } from 'expo-sqlite';
import type {
  Challenge,
  ChallengeDuration,
  ChallengeSummary,
  RestQuota,
} from './challenge-types';
import { addDays, getDaysDifference } from '../features/calendar/date-utils';

export type {
  Challenge,
  ChallengeDuration,
  ChallengeSummary,
  RestQuota,
};

export function getDurationQuota(duration: ChallengeDuration): RestQuota {
  if (duration === 7) return 1;
  if (duration === 14) return 2;
  return 3;
}

export async function createChallenge(
  db: SQLiteDatabase,
  startDate: string,
  durationDays: ChallengeDuration
): Promise<Challenge> {
  const restQuota = getDurationQuota(durationDays);
  const result = await db.runAsync(
    'INSERT INTO challenges (start_date, duration_days, rest_quota, settled_at) VALUES (?, ?, ?, NULL)',
    [startDate, durationDays, restQuota]
  );
  return {
    id: result.lastInsertRowId,
    start_date: startDate,
    duration_days: durationDays,
    rest_quota: restQuota,
    settled_at: null,
  };
}

export async function getLatestChallenge(
  db: SQLiteDatabase
): Promise<Challenge | null> {
  const row = await db.getFirstAsync<Challenge>(
    'SELECT id, start_date, duration_days, rest_quota, settled_at FROM challenges ORDER BY id DESC LIMIT 1'
  );
  return row ?? null;
}

export async function getActiveChallenge(
  db: SQLiteDatabase,
  currentLocalDate: string
): Promise<Challenge | null> {
  const latest = await getLatestChallenge(db);
  if (!latest) return null;
  const endDate = addDays(latest.start_date, latest.duration_days - 1);
  if (currentLocalDate >= latest.start_date && currentLocalDate <= endDate) {
    return latest;
  }
  return null;
}

export async function getUnsettledEndedChallenge(
  db: SQLiteDatabase,
  currentLocalDate: string
): Promise<Challenge | null> {
  const rows = await db.getAllAsync<Challenge>(
    'SELECT id, start_date, duration_days, rest_quota, settled_at FROM challenges WHERE settled_at IS NULL ORDER BY id DESC'
  );
  for (const challenge of rows) {
    const endDate = addDays(challenge.start_date, challenge.duration_days - 1);
    if (currentLocalDate > endDate) {
      return challenge;
    }
  }
  return null;
}

export async function canCreateChallenge(
  db: SQLiteDatabase,
  currentLocalDate: string
): Promise<boolean> {
  const active = await getActiveChallenge(db, currentLocalDate);
  return active === null;
}

export async function markChallengeSettled(
  db: SQLiteDatabase,
  challengeId: number,
  settledAt: string
): Promise<void> {
  await db.runAsync('UPDATE challenges SET settled_at = ? WHERE id = ?', [
    settledAt,
    challengeId,
  ]);
}

export async function getChallengeSummary(
  db: SQLiteDatabase,
  challenge: Challenge,
  currentLocalDate: string
): Promise<ChallengeSummary> {
  const startDate = challenge.start_date;
  const endDate = addDays(startDate, challenge.duration_days - 1);
  const isEnded = currentLocalDate > endDate;
  const isSettled = challenge.settled_at !== null;

  const restCountRow = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM rest_days WHERE challenge_id = ?',
    [challenge.id]
  );
  const restCount = restCountRow?.count ?? 0;
  const remainingRestQuota = Math.max(0, challenge.rest_quota - restCount);

  let remainingDays = 0;
  if (!isEnded) {
    if (currentLocalDate < startDate) {
      remainingDays = challenge.duration_days;
    } else {
      // 包含今天，建立日為 7/14/30，最後一天為 1
      remainingDays = Math.max(1, getDaysDifference(currentLocalDate, endDate) + 1);
    }
  }

  return {
    challenge,
    startDate,
    endDate,
    remainingDays,
    remainingRestQuota,
    isEnded,
    isSettled,
  };
}
