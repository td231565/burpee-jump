import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { DATABASE_NAME, initializeDatabase } from '../data/database';

export default function RootLayout() {
  return (
    <SQLiteProvider databaseName={DATABASE_NAME} onInit={initializeDatabase}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="workout" />
        <Stack.Screen
          name="day"
          options={{
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="audio-test"
          options={{
            headerShown: true,
            title: 'MVP 音訊驗證 (Phase 1.5)',
          }}
        />
      </Stack>
    </SQLiteProvider>
  );
}
