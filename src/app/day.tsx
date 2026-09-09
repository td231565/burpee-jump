import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { AppText } from '../components/ui/app-text';
import { Button } from '../components/ui/button';
import { colors, radius, spacing } from '../theme/tokens';
import {
  formatCompletedDateTime,
  formatDetailDate,
  formatLocalDateKey,
} from '../features/calendar/date-utils';
import { DailyCompletion, getCompletionByDate } from '../data/completions';

export default function DayDetailScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const { date } = useLocalSearchParams<{ date: string }>();

  const [completion, setCompletion] = useState<DailyCompletion | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const localDate = typeof date === 'string' ? date : '';
  const formattedDate = localDate ? formatDetailDate(localDate) : '';

  const todayKey = formatLocalDateKey(new Date());
  const isToday = localDate === todayKey;

  useEffect(() => {
    let isMounted = true;
    async function loadCompletion() {
      if (!db || !localDate) {
        setIsLoading(false);
        return;
      }
      try {
        const record = await getCompletionByDate(db, localDate);
        if (isMounted) {
          setCompletion(record);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }
    loadCompletion();
    return () => {
      isMounted = false;
    };
  }, [db, localDate]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <View style={styles.card}>
          <AppText variant="title" style={styles.dateTitle}>
            {formattedDate}
          </AppText>

          <View style={styles.statusContainer}>
            {!isLoading && (
              <>
                {completion ? (
                  <View style={styles.completedBadge}>
                    <AppText variant="headline" weight="bold" style={styles.completedText}>
                      ✓ 已完成
                    </AppText>
                    <AppText variant="body" style={styles.completedTimeText}>
                      {formatCompletedDateTime(completion.completed_at)}
                    </AppText>
                  </View>
                ) : isToday ? (
                  <View style={styles.pendingBadge}>
                    <AppText variant="headline" weight="bold" style={styles.pendingText}>
                      今日待完成
                    </AppText>
                  </View>
                ) : (
                  <View style={styles.emptyBadge}>
                    <AppText variant="body" style={styles.emptyText}>
                      無紀錄
                    </AppText>
                  </View>
                )}
              </>
            )}
          </View>
        </View>

        <View style={styles.footer}>
          <Button
            variant="secondary"
            onPress={() => router.back()}
            accessibilityLabel="關閉"
          >
            關閉
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.base,
    justifyContent: 'space-between',
    paddingVertical: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    marginTop: spacing.xl,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  dateTitle: {
    color: colors.ink,
    marginBottom: spacing.lg,
  },
  statusContainer: {
    width: '100%',
    alignItems: 'center',
    marginVertical: spacing.base,
  },
  completedBadge: {
    backgroundColor: colors.successLight,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.success,
    alignItems: 'center',
    width: '100%',
  },
  completedText: {
    color: colors.success,
  },
  completedTimeText: {
    color: colors.ink,
    marginTop: spacing.xs,
    fontSize: 14,
  },
  pendingBadge: {
    backgroundColor: colors.todayLight,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.todayBorder,
    alignItems: 'center',
    width: '100%',
  },
  pendingText: {
    color: colors.today,
  },
  emptyBadge: {
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    width: '100%',
  },
  emptyText: {
    color: colors.muted,
  },
  footer: {
    paddingBottom: spacing.lg,
  },
});
