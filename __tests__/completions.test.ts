import { DatabaseSync } from 'node:sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';
import {
  initializeDatabase,
  getCompletionByDate,
  getCompletionsForMonth,
  insertCompletion,
} from '../src/data/completions';

function createTestDatabase(): SQLiteDatabase {
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

describe('Completion Repository (Seam 3)', () => {
  let db: SQLiteDatabase;

  beforeEach(async () => {
    db = createTestDatabase();
    await initializeDatabase(db);
  });

  it('無紀錄時查詢特定日期回傳 null', async () => {
    const record = await getCompletionByDate(db, '2026-09-09');
    expect(record).toBeNull();
  });

  it('寫入完成紀錄後可正確讀回', async () => {
    await insertCompletion(db, '2026-09-09', '2026-09-09T02:00:00.000Z');
    const record = await getCompletionByDate(db, '2026-09-09');
    expect(record).toEqual({
      local_date: '2026-09-09',
      completed_at: '2026-09-09T02:00:00.000Z',
    });
  });

  it('重試寫入同日紀錄時保持冪等，不覆蓋第一次完成時間', async () => {
    const firstTime = '2026-09-09T02:00:00.000Z';
    const retryTime = '2026-09-09T02:05:00.000Z';

    await insertCompletion(db, '2026-09-09', firstTime);
    await insertCompletion(db, '2026-09-09', retryTime);

    const record = await getCompletionByDate(db, '2026-09-09');
    expect(record?.completed_at).toBe(firstTime);
  });

  it('查詢月份範圍紀錄時僅回傳邊界內的項目', async () => {
    await insertCompletion(db, '2026-08-31', '2026-08-31T12:00:00.000Z');
    await insertCompletion(db, '2026-09-01', '2026-09-01T12:00:00.000Z');
    await insertCompletion(db, '2026-09-15', '2026-09-15T12:00:00.000Z');
    await insertCompletion(db, '2026-09-30', '2026-09-30T12:00:00.000Z');
    await insertCompletion(db, '2026-10-01', '2026-10-01T12:00:00.000Z');

    const records = await getCompletionsForMonth(db, '2026-09-01', '2026-09-30');
    expect(records.map((r) => r.local_date)).toEqual(['2026-09-01', '2026-09-15', '2026-09-30']);
  });
});
