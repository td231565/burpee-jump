import { DatabaseSync } from 'node:sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';
import { initializeDatabase } from '../src/data/database';
import { createChallenge } from '../src/data/challenges';
import { insertCompletion } from '../src/data/completions';
import { setRestDay } from '../src/data/rest-days';
import {
  evaluateSettlement,
  persistSettlement,
} from '../src/features/challenge/settlement-service';

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

describe('Settlement Service (Slice 5)', () => {
  let db: SQLiteDatabase;

  beforeEach(async () => {
    db = createMockDb();
    await initializeDatabase(db);
  });

  it('挑戰期間全部完成，結算結果為 completed，不觸發補登挽救', async () => {
    // 7 天挑戰：2026-09-01 ~ 2026-09-07
    const challenge = await createChallenge(db, '2026-09-01', 7);
    for (let i = 1; i <= 7; i++) {
      await insertCompletion(db, `2026-09-0${i}`, `2026-09-0${i}T12:00:00.000Z`);
    }

    const evalResult = await evaluateSettlement(db, challenge, '2026-09-08');
    expect(evalResult.outcome).toBe('completed');
    expect(evalResult.canRescue).toBe(false);
  });

  it('完成日與休息日混合且全滿，結算結果為 completed', async () => {
    const challenge = await createChallenge(db, '2026-09-01', 7);
    // 09-01 ~ 09-06 完成，09-07 休息
    for (let i = 1; i <= 6; i++) {
      await insertCompletion(db, `2026-09-0${i}`, `2026-09-0${i}T12:00:00.000Z`);
    }
    await setRestDay(db, '2026-09-07', challenge.id, '2026-09-07T08:00:00.000Z');

    const evalResult = await evaluateSettlement(db, challenge, '2026-09-08');
    expect(evalResult.outcome).toBe('completed');
    expect(evalResult.canRescue).toBe(false);
  });

  it('僅最後一天為昨天且無紀錄、有剩餘額度時，符合補登挽救條件', async () => {
    const challenge = await createChallenge(db, '2026-09-01', 7);
    // 09-01 ~ 09-06 完成，09-07 (最後一天) 無紀錄
    for (let i = 1; i <= 6; i++) {
      await insertCompletion(db, `2026-09-0${i}`, `2026-09-0${i}T12:00:00.000Z`);
    }

    // 今天是 2026-09-08 (最後一天 09-07 為昨天)
    const evalResult = await evaluateSettlement(db, challenge, '2026-09-08');
    expect(evalResult.outcome).toBe('uncompleted');
    expect(evalResult.canRescue).toBe(true);
  });

  it('最後一天無紀錄但額度已用完時，不符合補登挽救條件，直接 uncompleted', async () => {
    const challenge = await createChallenge(db, '2026-09-01', 7); // 額度 1
    // 09-02 休息 (額度歸 0)
    await setRestDay(db, '2026-09-02', challenge.id, '2026-09-02T08:00:00.000Z');
    for (const d of ['01', '03', '04', '05', '06']) {
      await insertCompletion(db, `2026-09-${d}`, `2026-09-${d}T12:00:00.000Z`);
    }
    // 09-07 無紀錄

    const evalResult = await evaluateSettlement(db, challenge, '2026-09-08');
    expect(evalResult.outcome).toBe('uncompleted');
    expect(evalResult.canRescue).toBe(false);
  });

  it('除了最後一天外，前面亦有過期無紀錄日時，不可補登挽救，直接結算', async () => {
    const challenge = await createChallenge(db, '2026-09-01', 7);
    // 09-01 完成，09-02 無紀錄，09-03~09-06 完成，09-07 無紀錄
    for (const d of ['01', '03', '04', '05', '06']) {
      await insertCompletion(db, `2026-09-${d}`, `2026-09-${d}T12:00:00.000Z`);
    }

    const evalResult = await evaluateSettlement(db, challenge, '2026-09-08');
    expect(evalResult.outcome).toBe('uncompleted');
    expect(evalResult.canRescue).toBe(false);
  });

  it('persistSettlement 成功持久化已結算標記', async () => {
    const challenge = await createChallenge(db, '2026-09-01', 7);
    const success = await persistSettlement(db, challenge.id, '2026-09-08T00:00:00.000Z');
    expect(success).toBe(true);

    const updated = await db.getFirstAsync<{ settled_at: string }>(
      'SELECT settled_at FROM challenges WHERE id = ?',
      [challenge.id]
    );
    expect(updated?.settled_at).toBe('2026-09-08T00:00:00.000Z');
  });
});
