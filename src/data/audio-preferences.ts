import type { SQLiteDatabase } from 'expo-sqlite';

export interface AudioPreferences {
  voice_enabled: boolean;
  cues_enabled: boolean;
  music_enabled: boolean;
}

interface AudioPreferencesRow {
  id: number;
  voice_enabled: number;
  cues_enabled: number;
  music_enabled: number;
}

export async function getAudioPreferences(db: SQLiteDatabase): Promise<AudioPreferences> {
  const row = await db.getFirstAsync<AudioPreferencesRow>(
    'SELECT voice_enabled, cues_enabled, music_enabled FROM audio_preferences WHERE id = 1;'
  );

  if (!row) {
    return {
      voice_enabled: true,
      cues_enabled: true,
      music_enabled: true,
    };
  }

  return {
    voice_enabled: row.voice_enabled === 1,
    cues_enabled: row.cues_enabled === 1,
    music_enabled: row.music_enabled === 1,
  };
}

export async function updateAudioPreferences(
  db: SQLiteDatabase,
  preferences: AudioPreferences
): Promise<void> {
  await db.runAsync(
    `UPDATE audio_preferences
     SET voice_enabled = ?, cues_enabled = ?, music_enabled = ?
     WHERE id = 1;`,
    [
      preferences.voice_enabled ? 1 : 0,
      preferences.cues_enabled ? 1 : 0,
      preferences.music_enabled ? 1 : 0,
    ]
  );
}
