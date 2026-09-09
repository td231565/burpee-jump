import type { SQLiteDatabase } from 'expo-sqlite';
import { initializeDatabase } from './database';

export { initializeDatabase };

export interface DailyCompletion {
  local_date: string;
  completed_at: string;
}

/**
 * 依當地日期 (YYYY-MM-DD) 查詢特定日之完成紀錄
 */
export async function getCompletionByDate(
  db: SQLiteDatabase,
  localDate: string
): Promise<DailyCompletion | null> {
  const result = await db.getFirstAsync<DailyCompletion>(
    'SELECT local_date, completed_at FROM daily_completions WHERE local_date = ?',
    [localDate]
  );
  return result ?? null;
}

/**
 * 查詢特定月份範圍內的所有完成紀錄
 */
export async function getCompletionsForMonth(
  db: SQLiteDatabase,
  startDate: string,
  endDate: string
): Promise<DailyCompletion[]> {
  const rows = await db.getAllAsync<DailyCompletion>(
    'SELECT local_date, completed_at FROM daily_completions WHERE local_date >= ? AND local_date <= ? ORDER BY local_date ASC',
    [startDate, endDate]
  );
  return rows ?? [];
}

/**
 * 寫入一筆完成紀錄；若已有同日紀錄則 DO NOTHING 保持冪等，保留第一次完成時間
 */
export async function insertCompletion(
  db: SQLiteDatabase,
  localDate: string,
  completedAt: string
): Promise<void> {
  await db.runAsync(
    'INSERT INTO daily_completions (local_date, completed_at) VALUES (?, ?) ON CONFLICT(local_date) DO NOTHING',
    [localDate, completedAt]
  );
}
