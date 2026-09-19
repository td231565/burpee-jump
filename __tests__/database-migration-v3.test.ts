import { DatabaseSync } from 'node:sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';
import { initializeDatabase } from '../src/data/database';

function createMockDb(): { db: SQLiteDatabase; sqlite: DatabaseSync } {
  const sqlite = new DatabaseSync(':memory:');
  const db = {
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

  return { db, sqlite };
}

describe('Database Schema Migration v3 (Slice 0)', () => {
  it('自既有 v2 升級至 v3 時保留原有資料並建立 challenges 與 rest_days 表', async () => {
    const { db, sqlite } = createMockDb();

    // 先模擬 v2 schema 與資料
    sqlite.exec(`
      PRAGMA user_version = 2;
      CREATE TABLE IF NOT EXISTS daily_completions (
        local_date TEXT PRIMARY KEY NOT NULL,
        completed_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS audio_preferences (
        id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
        voice_enabled INTEGER NOT NULL DEFAULT 1,
        cues_enabled INTEGER NOT NULL DEFAULT 1,
        music_enabled INTEGER NOT NULL DEFAULT 1
      );
      INSERT INTO audio_preferences (id, voice_enabled, cues_enabled, music_enabled) VALUES (1, 1, 0, 1);
      CREATE TABLE IF NOT EXISTS user_profile (
        id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
        nickname TEXT
      );
      INSERT INTO user_profile (id, nickname) VALUES (1, '測試者');
      CREATE TABLE IF NOT EXISTS onboarding_state (
        id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
        onboarding_presented INTEGER NOT NULL DEFAULT 0
      );
      INSERT INTO onboarding_state (id, onboarding_presented) VALUES (1, 1);
      INSERT INTO daily_completions (local_date, completed_at) VALUES ('2026-09-08', '2026-09-08T12:00:00.000Z');
    `);

    // 執行 initializeDatabase (升級至 v3)
    await initializeDatabase(db);

    // 驗證 user_version
    const versionRow = sqlite.prepare('PRAGMA user_version').get() as { user_version: number };
    expect(versionRow.user_version).toBe(3);

    // 驗證舊資料完整保留
    const profileRow = sqlite.prepare('SELECT nickname FROM user_profile WHERE id = 1').get() as { nickname: string };
    expect(profileRow.nickname).toBe('測試者');

    const completionRow = sqlite.prepare('SELECT local_date, completed_at FROM daily_completions WHERE local_date = ?').get('2026-09-08') as { local_date: string; completed_at: string };
    expect(completionRow.completed_at).toBe('2026-09-08T12:00:00.000Z');

    // 驗證新表可正常寫入
    sqlite.prepare('INSERT INTO challenges (start_date, duration_days, rest_quota) VALUES (?, ?, ?)').run('2026-09-09', 7, 1);
    const challengeRow = sqlite.prepare('SELECT start_date, duration_days, rest_quota FROM challenges WHERE start_date = ?').get('2026-09-09') as any;
    expect(challengeRow.duration_days).toBe(7);
    expect(challengeRow.rest_quota).toBe(1);

    sqlite.prepare('INSERT INTO rest_days (local_date, challenge_id, created_at) VALUES (?, ?, ?)').run('2026-09-10', 1, '2026-09-10T00:00:00.000Z');
    const restRow = sqlite.prepare('SELECT local_date FROM rest_days WHERE local_date = ?').get('2026-09-10') as any;
    expect(restRow.local_date).toBe('2026-09-10');
  });
});
