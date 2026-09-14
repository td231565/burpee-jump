import { DatabaseSync } from 'node:sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';
import { initializeDatabase } from '../src/data/database';
import { hasPresentedOnboarding, markOnboardingPresented } from '../src/data/onboarding';

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

describe('Onboarding Repository (Slice 0)', () => {
  let db: SQLiteDatabase;

  beforeEach(async () => {
    db = createTestDatabase();
    await initializeDatabase(db);
  });

  it('初始化後預設 onboarding_presented 為 false', async () => {
    const presented = await hasPresentedOnboarding(db);
    expect(presented).toBe(false);
  });

  it('重複初始化維持冪等，不新增第二列或拋錯', async () => {
    await initializeDatabase(db);
    const presented = await hasPresentedOnboarding(db);
    expect(presented).toBe(false);
  });

  it('呼叫 markOnboardingPresented 後，狀態變為 true', async () => {
    await markOnboardingPresented(db);
    const presented = await hasPresentedOnboarding(db);
    expect(presented).toBe(true);
  });

  it('多次呼叫 markOnboardingPresented 維持冪等且為 true', async () => {
    await markOnboardingPresented(db);
    await markOnboardingPresented(db);
    const presented = await hasPresentedOnboarding(db);
    expect(presented).toBe(true);
  });
});
