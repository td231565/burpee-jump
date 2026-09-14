import type { SQLiteDatabase } from 'expo-sqlite';

interface OnboardingStateRow {
  id: number;
  onboarding_presented: number;
}

export async function hasPresentedOnboarding(db: SQLiteDatabase): Promise<boolean> {
  const row = await db.getFirstAsync<OnboardingStateRow>(
    'SELECT onboarding_presented FROM onboarding_state WHERE id = 1;'
  );

  if (!row) {
    return false;
  }

  return row.onboarding_presented === 1;
}

export async function markOnboardingPresented(db: SQLiteDatabase): Promise<void> {
  await db.runAsync(
    `UPDATE onboarding_state
     SET onboarding_presented = 1
     WHERE id = 1;`
  );
}
