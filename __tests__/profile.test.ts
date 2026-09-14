import { DatabaseSync } from 'node:sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';
import { initializeDatabase } from '../src/data/database';
import { getUserProfile, updateNickname } from '../src/data/profile';

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

describe('Profile Repository (Slice 0)', () => {
  let db: SQLiteDatabase;

  beforeEach(async () => {
    db = createTestDatabase();
    await initializeDatabase(db);
  });

  it('初始化後預設個人資料 nickname 為 null', async () => {
    const profile = await getUserProfile(db);
    expect(profile.nickname).toBeNull();
  });

  it('重複初始化維持冪等，不新增第二列或拋錯', async () => {
    await initializeDatabase(db);
    const profile = await getUserProfile(db);
    expect(profile.nickname).toBeNull();
  });

  it('可寫入並讀取字串暱稱', async () => {
    await updateNickname(db, '小明');
    const profile = await getUserProfile(db);
    expect(profile.nickname).toBe('小明');
  });

  it('寫入時前後空白會被 trim，但保留中間空白與非拉丁字元', async () => {
    await updateNickname(db, '   小 明  ');
    const profile = await getUserProfile(db);
    expect(profile.nickname).toBe('小 明');
  });

  it('空字串或純空白字串寫入時會保存為 null', async () => {
    await updateNickname(db, '小明');
    await updateNickname(db, '   ');
    const profile = await getUserProfile(db);
    expect(profile.nickname).toBeNull();
  });

  it('傳入 null 寫入時保存為 null', async () => {
    await updateNickname(db, '小明');
    await updateNickname(db, null);
    const profile = await getUserProfile(db);
    expect(profile.nickname).toBeNull();
  });
});
