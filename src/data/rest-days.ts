import type { SQLiteDatabase } from 'expo-sqlite';
import type { RestDay } from './challenge-types';
import { formatLocalDateKey } from '../features/calendar/date-utils';

export async function getRestDayByDate(
  db: SQLiteDatabase,
  localDate: string
): Promise<RestDay | null> {
  const row = await db.getFirstAsync<RestDay>(
    'SELECT local_date, challenge_id, created_at FROM rest_days WHERE local_date = ?',
    [localDate]
  );
  return row ?? null;
}

export async function getRestDaysForRange(
  db: SQLiteDatabase,
  startDate: string,
  endDate: string
): Promise<RestDay[]> {
  const rows = await db.getAllAsync<RestDay>(
    'SELECT local_date, challenge_id, created_at FROM rest_days WHERE local_date >= ? AND local_date <= ? ORDER BY local_date ASC',
    [startDate, endDate]
  );
  return rows ?? [];
}

export async function setRestDay(
  db: SQLiteDatabase,
  localDate: string,
  challengeId: number,
  createdAt: string
): Promise<void> {
  await db.runAsync(
    'INSERT INTO rest_days (local_date, challenge_id, created_at) VALUES (?, ?, ?) ON CONFLICT(local_date) DO NOTHING',
    [localDate, challengeId, createdAt]
  );
}

export async function cancelRestDay(
  db: SQLiteDatabase,
  localDate: string
): Promise<void> {
  await db.runAsync('DELETE FROM rest_days WHERE local_date = ?', [localDate]);
}

/**
 * 當日休息於當日結束前可取消；昨天補登休息於補登當日結束前可取消。
 * 因此只要目前當地日期與 created_at 所在的當地日期一致，即在合法取消期限內。
 */
export function isRestDayCancellable(
  restDay: RestDay,
  currentLocalDate: string
): boolean {
  const createdLocalDate = formatLocalDateKey(new Date(restDay.created_at));
  return createdLocalDate === currentLocalDate;
}
