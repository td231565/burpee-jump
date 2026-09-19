import { DatabaseSync } from 'node:sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';
import { initializeDatabase } from '../src/data/database';
import { insertCompletion, getCompletionByDate } from '../src/data/completions';
import { setRestDay, getRestDayByDate } from '../src/data/rest-days';
import { createChallenge, getChallengeSummary } from '../src/data/challenges';

function createMockDb(): SQLiteDatabase {
  const sqlite = new DatabaseSync(':memory:');
  return {
    execAsync: async (sql: string) => {
      sqlite.exec(sql);
    },
    runAsync: async (sql: string, params: any[] = []) => {
      const stmt = sqlite.prepare(sql);
      const result = stmt.run(...params);
      return {
        lastInsertRowId: Number(result.lastInsertRowid),
        changes: Number(result.changes),
      };
    },
    getFirstAsync: async <T>(sql: string, params: any[] = []) => {
      const stmt = sqlite.prepare(sql);
      const row = stmt.get(...params);
      return (row as T) ?? null;
    },
    getAllAsync: async <T>(sql: string, params: any[] = []) => {
      const stmt = sqlite.prepare(sql);
      const rows = stmt.all(...params);
      return rows as T[];
    },
  } as unknown as SQLiteDatabase;
}

describe('Workout Overrides Rest Day (Slice 2 & 3)', () => {
  let db: SQLiteDatabase;

  beforeEach(async () => {
    db = createMockDb();
    await initializeDatabase(db);
  });

  it('當日先設定休息日，成功儲存訓練後自動轉為完成日並移除休息日退還額度', async () => {
    const challenge = await createChallenge(db, '2026-09-01', 7); // 額度 1

    // 09-02 設定休息
    await setRestDay(db, '2026-09-02', challenge.id, '2026-09-02T08:00:00.000Z');
    let summary = await getChallengeSummary(db, challenge, '2026-09-02');
    expect(summary.remainingRestQuota).toBe(0);

    // 隨後於當日完成訓練儲存
    await insertCompletion(db, '2026-09-02', '2026-09-02T18:00:00.000Z');

    // 驗證完成紀錄存在
    const completion = await getCompletionByDate(db, '2026-09-02');
    expect(completion).not.toBeNull();
    expect(completion?.local_date).toBe('2026-09-02');

    // 驗證休息日已在同一交易中被移除
    const restDay = await getRestDayByDate(db, '2026-09-02');
    expect(restDay).toBeNull();

    // 驗證額度自然退還
    summary = await getChallengeSummary(db, challenge, '2026-09-02');
    expect(summary.remainingRestQuota).toBe(1);
  });
});
