import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { SQLiteDatabase } from 'expo-sqlite';
import { initializeDatabase } from '../src/data/database';
import { getWorkoutPreferences, saveWorkoutPreferences } from '../src/data/workout-preferences';
import type { WorkoutParameters } from '../src/features/workout/tabata';

function createMockDb(sqlite: DatabaseSync): SQLiteDatabase {
  const db = {
    execAsync: async (sql: string) => sqlite.exec(sql),
    runAsync: async (sql: string, params: any[] = []) => {
      const result = sqlite.prepare(sql).run(...params);
      return {
        lastInsertRowId: Number(result.lastInsertRowid),
        changes: Number(result.changes),
      };
    },
    getFirstAsync: async <T>(sql: string, params: any[] = []) => {
      const row = sqlite.prepare(sql).get(...params);
      return (row as T) ?? null;
    },
  } as unknown as SQLiteDatabase;
  return db;
}

describe('Workout preferences', () => {
  it('新資料庫使用 20／10／4，開始後保存的三項參數可重新讀回', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'burpeejump-workout-preferences-'));
    const filename = join(directory, 'preferences.db');
    const selected: WorkoutParameters = { workSeconds: 32, restSeconds: 14, rounds: 7 };
    try {
      const firstConnection = new DatabaseSync(filename);
      const firstDb = createMockDb(firstConnection);
      await initializeDatabase(firstDb);
      expect(await getWorkoutPreferences(firstDb)).toEqual({
        workSeconds: 20,
        restSeconds: 10,
        rounds: 4,
      });
      await saveWorkoutPreferences(firstDb, selected);
      firstConnection.close();

      const reopenedConnection = new DatabaseSync(filename);
      expect(await getWorkoutPreferences(createMockDb(reopenedConnection))).toEqual(selected);
      reopenedConnection.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('單筆更新失敗時三項舊參數與其他使用者資料均保持不變', async () => {
    const sqlite = new DatabaseSync(':memory:');
    const db = createMockDb(sqlite);
    await initializeDatabase(db);
    await saveWorkoutPreferences(db, { workSeconds: 32, restSeconds: 18, rounds: 8 });
    sqlite.prepare('INSERT INTO daily_completions (local_date, completed_at) VALUES (?, ?)')
      .run('2026-09-08', '2026-09-08T12:00:00.000Z');
    sqlite.prepare('UPDATE audio_preferences SET voice_enabled = 0 WHERE id = 1').run();
    sqlite.exec(`CREATE TRIGGER fail_workout_preferences_update
      BEFORE UPDATE ON workout_preferences
      BEGIN SELECT RAISE(ABORT, 'disk unavailable'); END;`);

    await expect(saveWorkoutPreferences(db, { workSeconds: 34, restSeconds: 20, rounds: 9 }))
      .rejects.toThrow();

    expect(await getWorkoutPreferences(db)).toEqual({
      workSeconds: 32,
      restSeconds: 18,
      rounds: 8,
    });
    expect(sqlite.prepare('SELECT local_date, completed_at FROM daily_completions').get()).toEqual({
      local_date: '2026-09-08',
      completed_at: '2026-09-08T12:00:00.000Z',
    });
    expect(sqlite.prepare('SELECT voice_enabled FROM audio_preferences WHERE id = 1').get()).toEqual({
      voice_enabled: 0,
    });
    sqlite.close();
  });
});
