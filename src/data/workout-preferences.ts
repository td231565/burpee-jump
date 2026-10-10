import type { SQLiteDatabase } from 'expo-sqlite';
import { DEFAULT_WORKOUT_PARAMETERS, type WorkoutParameters } from '../features/workout/tabata';

interface WorkoutPreferencesRow {
  work_seconds: number;
  rest_seconds: number;
  rounds: number;
}

export async function getWorkoutPreferences(db: SQLiteDatabase): Promise<WorkoutParameters> {
  const row = await db.getFirstAsync<WorkoutPreferencesRow>(
    'SELECT work_seconds, rest_seconds, rounds FROM workout_preferences WHERE id = 1;'
  );

  if (!row) return { ...DEFAULT_WORKOUT_PARAMETERS };

  return {
    workSeconds: row.work_seconds,
    restSeconds: row.rest_seconds,
    rounds: row.rounds,
  };
}

export async function saveWorkoutPreferences(
  db: SQLiteDatabase,
  parameters: WorkoutParameters
): Promise<void> {
  await db.runAsync(
    `UPDATE workout_preferences
     SET work_seconds = ?, rest_seconds = ?, rounds = ?
     WHERE id = 1;`,
    [parameters.workSeconds, parameters.restSeconds, parameters.rounds]
  );
}
