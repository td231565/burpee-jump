import { DatabaseSync } from 'node:sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';
import { initializeDatabase } from '../src/data/database';
import {
  setRestDay,
  cancelRestDay,
  getRestDayByDate,
  getRestDaysForRange,
  isRestDayCancellable,
} from '../src/data/rest-days';
import { createChallenge } from '../src/data/challenges';

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

describe('Rest Days Repository (Slice 0 & 3 & 4)', () => {
  let db: SQLiteDatabase;
  let challengeId: number;

  beforeEach(async () => {
    db = createMockDb();
    await initializeDatabase(db);
    const challenge = await createChallenge(db, '2026-09-01', 7);
    challengeId = challenge.id;
  });

  it('設定休息日可成功讀回，取消休息日後被刪除', async () => {
    await setRestDay(db, '2026-09-02', challengeId, '2026-09-02T08:00:00.000Z');
    const record = await getRestDayByDate(db, '2026-09-02');
    expect(record).not.toBeNull();
    expect(record?.local_date).toBe('2026-09-02');

    await cancelRestDay(db, '2026-09-02');
    const afterCancel = await getRestDayByDate(db, '2026-09-02');
    expect(afterCancel).toBeNull();
  });

  it('同日重複設定休息日維持冪等', async () => {
    await setRestDay(db, '2026-09-02', challengeId, '2026-09-02T08:00:00.000Z');
    await setRestDay(db, '2026-09-02', challengeId, '2026-09-02T09:00:00.000Z');
    const records = await getRestDaysForRange(db, '2026-09-01', '2026-09-07');
    expect(records.length).toBe(1);
    expect(records[0].created_at).toBe('2026-09-02T08:00:00.000Z');
  });

  it('isRestDayCancellable: 當日設定或隔日補登，僅在建立的當地日結束前可取消', () => {
    // 當日設定：2026-09-02 設定今天為休息日
    const todayRest = {
      local_date: '2026-09-02',
      challenge_id: challengeId,
      created_at: '2026-09-02T10:00:00',
    };
    expect(isRestDayCancellable(todayRest, '2026-09-02')).toBe(true);
    expect(isRestDayCancellable(todayRest, '2026-09-03')).toBe(false);

    // 隔日補登：2026-09-03 補登昨天 2026-09-02 為休息日
    const makeupRest = {
      local_date: '2026-09-02',
      challenge_id: challengeId,
      created_at: '2026-09-03T10:00:00',
    };
    // 補登當天 (09-03) 結束前可取消
    expect(isRestDayCancellable(makeupRest, '2026-09-03')).toBe(true);
    // 跨日後 (09-04) 不可取消
    expect(isRestDayCancellable(makeupRest, '2026-09-04')).toBe(false);
  });
});
