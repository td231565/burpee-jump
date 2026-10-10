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

describe('Database Schema Migration v4 (Workout preferences)', () => {
  it('自既有 v3 升級至 v4 時保留所有原有資料並建立預設訓練參數', async () => {
    const { db, sqlite } = createMockDb();

    // 先模擬 v2 schema 與資料
    sqlite.exec(`
      PRAGMA user_version = 3;
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
      CREATE TABLE IF NOT EXISTS challenges (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        start_date TEXT NOT NULL,
        duration_days INTEGER NOT NULL CHECK (duration_days IN (7, 14, 30)),
        rest_quota INTEGER NOT NULL CHECK (rest_quota IN (1, 2, 3)),
        settled_at TEXT
      );
      CREATE TABLE IF NOT EXISTS rest_days (
        local_date TEXT PRIMARY KEY NOT NULL,
        challenge_id INTEGER NOT NULL REFERENCES challenges(id),
        created_at TEXT NOT NULL
      );
      INSERT INTO challenges (id, start_date, duration_days, rest_quota) VALUES (1, '2026-09-01', 7, 1);
      INSERT INTO rest_days (local_date, challenge_id, created_at) VALUES ('2026-09-07', 1, '2026-09-07T08:00:00.000Z');
    `);

    // 執行 initializeDatabase (升級至 v4)
    await initializeDatabase(db);

    // 驗證 user_version 與預設訓練參數
    const versionRow = sqlite.prepare('PRAGMA user_version').get() as { user_version: number };
    expect(versionRow.user_version).toBe(4);
    expect(sqlite.prepare('SELECT work_seconds, rest_seconds, rounds FROM workout_preferences WHERE id = 1').get()).toEqual({
      work_seconds: 20,
      rest_seconds: 10,
      rounds: 4,
    });

    // 驗證舊資料完整保留
    const profileRow = sqlite.prepare('SELECT nickname FROM user_profile WHERE id = 1').get() as { nickname: string };
    expect(profileRow.nickname).toBe('測試者');

    const completionRow = sqlite.prepare('SELECT local_date, completed_at FROM daily_completions WHERE local_date = ?').get('2026-09-08') as { local_date: string; completed_at: string };
    expect(completionRow.completed_at).toBe('2026-09-08T12:00:00.000Z');

    expect(sqlite.prepare('SELECT voice_enabled, cues_enabled, music_enabled FROM audio_preferences WHERE id = 1').get()).toEqual({
      voice_enabled: 1,
      cues_enabled: 0,
      music_enabled: 1,
    });
    expect(sqlite.prepare('SELECT onboarding_presented FROM onboarding_state WHERE id = 1').get()).toEqual({
      onboarding_presented: 1,
    });
    expect(sqlite.prepare('SELECT start_date, duration_days, rest_quota FROM challenges WHERE id = 1').get()).toEqual({
      start_date: '2026-09-01',
      duration_days: 7,
      rest_quota: 1,
    });
    expect(sqlite.prepare('SELECT local_date, challenge_id FROM rest_days WHERE local_date = ?').get('2026-09-07')).toEqual({
      local_date: '2026-09-07',
      challenge_id: 1,
    });

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
