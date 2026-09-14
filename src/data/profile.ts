import type { SQLiteDatabase } from 'expo-sqlite';

export interface UserProfile {
  nickname: string | null;
}

interface UserProfileRow {
  id: number;
  nickname: string | null;
}

export async function getUserProfile(db: SQLiteDatabase): Promise<UserProfile> {
  const row = await db.getFirstAsync<UserProfileRow>(
    'SELECT nickname FROM user_profile WHERE id = 1;'
  );

  if (!row) {
    return {
      nickname: null,
    };
  }

  return {
    nickname: row.nickname,
  };
}

export async function updateNickname(
  db: SQLiteDatabase,
  nickname: string | null
): Promise<void> {
  const trimmed = nickname !== null ? nickname.trim() : null;
  const finalValue = trimmed && trimmed.length > 0 ? trimmed : null;

  await db.runAsync(
    `UPDATE user_profile
     SET nickname = ?
     WHERE id = 1;`,
    [finalValue]
  );
}
