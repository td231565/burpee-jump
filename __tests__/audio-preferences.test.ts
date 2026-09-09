import { DatabaseSync } from 'node:sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';
import { initializeDatabase } from '../src/data/database';
import {
  getAudioPreferences,
  updateAudioPreferences,
  type AudioPreferences,
} from '../src/data/audio-preferences';

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

describe('Audio Preferences Repository (Seam 3)', () => {
  let db: SQLiteDatabase;

  beforeEach(async () => {
    db = createTestDatabase();
    await initializeDatabase(db);
  });

  it('初始資料庫包含預設皆為開啟的音訊偏好', async () => {
    const prefs = await getAudioPreferences(db);
    expect(prefs).toEqual<AudioPreferences>({
      voice_enabled: true,
      cues_enabled: true,
      music_enabled: true,
    });
  });

  it('可個別更新音訊偏好並持久化讀回', async () => {
    await updateAudioPreferences(db, {
      voice_enabled: false,
      cues_enabled: true,
      music_enabled: false,
    });

    const updated = await getAudioPreferences(db);
    expect(updated).toEqual<AudioPreferences>({
      voice_enabled: false,
      cues_enabled: true,
      music_enabled: false,
    });
  });
});
