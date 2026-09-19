import { DatabaseSync } from 'node:sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';
import { initializeDatabase } from '../src/data/database';
import {
  createChallenge,
  getChallengeSummary,
  canCreateChallenge,
  markChallengeSettled,
  getUnsettledEndedChallenge,
} from '../src/data/challenges';
import { setRestDay } from '../src/data/rest-days';

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

describe('Challenges Repository (Slice 0 & 1)', () => {
  let db: SQLiteDatabase;

  beforeEach(async () => {
    db = createMockDb();
    await initializeDatabase(db);
  });

  it('建立 7 天挑戰時額度為 1，起迄日固定且包含第 1 天', async () => {
    const challenge = await createChallenge(db, '2026-09-01', 7);
    expect(challenge.duration_days).toBe(7);
    expect(challenge.rest_quota).toBe(1);

    const summary = await getChallengeSummary(db, challenge, '2026-09-01');
    expect(summary.startDate).toBe('2026-09-01');
    expect(summary.endDate).toBe('2026-09-07');
    // 包含今天：建立日為 7
    expect(summary.remainingDays).toBe(7);
    expect(summary.remainingRestQuota).toBe(1);
    expect(summary.isEnded).toBe(false);
  });

  it('建立 14 天挑戰時額度為 2，30 天挑戰時額度為 3', async () => {
    const c14 = await createChallenge(db, '2026-09-01', 14);
    expect(c14.rest_quota).toBe(2);

    const c30 = await createChallenge(db, '2026-09-01', 30);
    expect(c30.rest_quota).toBe(3);
  });

  it('週期內不可建立新挑戰，結束隔天可建立新挑戰', async () => {
    await createChallenge(db, '2026-09-01', 7);
    // 結束日為 2026-09-07

    // 2026-09-05 仍在週期內
    const canCreateMid = await canCreateChallenge(db, '2026-09-05');
    expect(canCreateMid).toBe(false);

    // 2026-09-07 最後一天仍不可建立
    const canCreateLast = await canCreateChallenge(db, '2026-09-07');
    expect(canCreateLast).toBe(false);

    // 2026-09-08 結束隔天，可建立新挑戰
    const canCreateNext = await canCreateChallenge(db, '2026-09-08');
    expect(canCreateNext).toBe(true);
  });

  it('剩餘休息額度隨休息日數扣減，不另存可變欄位', async () => {
    const challenge = await createChallenge(db, '2026-09-01', 14); // 額度 2
    await setRestDay(db, '2026-09-03', challenge.id, '2026-09-03T10:00:00.000Z');

    const summary1 = await getChallengeSummary(db, challenge, '2026-09-04');
    expect(summary1.remainingRestQuota).toBe(1);

    await setRestDay(db, '2026-09-05', challenge.id, '2026-09-05T10:00:00.000Z');
    const summary2 = await getChallengeSummary(db, challenge, '2026-09-06');
    expect(summary2.remainingRestQuota).toBe(0);
  });

  it('結束隔天取得已結束未結算挑戰，並在標記結算後排除', async () => {
    const challenge = await createChallenge(db, '2026-09-01', 7);
    // 結束日為 2026-09-07

    const unsettled = await getUnsettledEndedChallenge(db, '2026-09-08');
    expect(unsettled?.id).toBe(challenge.id);

    await markChallengeSettled(db, challenge.id, '2026-09-08T00:00:00.000Z');
    const settledCheck = await getUnsettledEndedChallenge(db, '2026-09-08');
    expect(settledCheck).toBeNull();
  });
});
