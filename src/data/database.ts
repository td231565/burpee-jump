import type { SQLiteDatabase } from 'expo-sqlite';

export const DATABASE_NAME = 'burpeejump.db';

export async function initializeDatabase(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA user_version = 2;
    CREATE TABLE IF NOT EXISTS daily_completions (
      local_date TEXT PRIMARY KEY NOT NULL,
      completed_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS audio_preferences (
      id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
      voice_enabled INTEGER NOT NULL DEFAULT 1 CHECK (voice_enabled IN (0, 1)),
      cues_enabled INTEGER NOT NULL DEFAULT 1 CHECK (cues_enabled IN (0, 1)),
      music_enabled INTEGER NOT NULL DEFAULT 1 CHECK (music_enabled IN (0, 1))
    );
    INSERT OR IGNORE INTO audio_preferences
      (id, voice_enabled, cues_enabled, music_enabled)
    VALUES (1, 1, 1, 1);
    CREATE TABLE IF NOT EXISTS user_profile (
      id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
      nickname TEXT
    );
    INSERT OR IGNORE INTO user_profile (id, nickname) VALUES (1, NULL);
    CREATE TABLE IF NOT EXISTS onboarding_state (
      id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
      onboarding_presented INTEGER NOT NULL DEFAULT 0
        CHECK (onboarding_presented IN (0, 1))
    );
    INSERT OR IGNORE INTO onboarding_state (id, onboarding_presented) VALUES (1, 0);
  `);
}

