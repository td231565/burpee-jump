import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { AppText } from '../components/ui/app-text';
import { Button } from '../components/ui/button';
import { ConfirmDialog } from '../components/ui/confirm-dialog';
import { colors, radius, spacing } from '../theme/tokens';
import {
  formatCompletedDateTime,
  formatDetailDate,
  formatLocalDateKey,
  getYesterday,
} from '../features/calendar/date-utils';
import { DailyCompletion, getCompletionByDate } from '../data/completions';
import {
  cancelRestDay,
  getRestDayByDate,
  isRestDayCancellable,
  setRestDay,
} from '../data/rest-days';
import { getChallengeSummary, getLatestChallenge } from '../data/challenges';
import type { RestDay } from '../data/challenge-types';

export default function DayDetailScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const { date } = useLocalSearchParams<{ date: string }>();

  const [completion, setCompletion] = useState<DailyCompletion | null>(null);
  const [restDay, setRestDayState] = useState<RestDay | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [canMakeupRest, setCanMakeupRest] = useState(false);
  const [targetChallengeId, setTargetChallengeId] = useState<number | null>(null);
  const [showMakeupConfirm, setShowMakeupConfirm] = useState(false);

  const localDate = typeof date === 'string' ? date : '';
  const formattedDate = localDate ? formatDetailDate(localDate) : '';

  const todayKey = formatLocalDateKey(new Date());
  const isToday = localDate === todayKey;
  const isYesterday = localDate === getYesterday(todayKey);

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let isMounted = true;
    if (!db || !localDate) {
      return;
    }

    Promise.all([
      getCompletionByDate(db, localDate),
      getRestDayByDate(db, localDate),
      getLatestChallenge(db),
    ])
      .then(async ([compRecord, restRecord, latestChallenge]) => {
        if (!isMounted) return;
        setCompletion(compRecord);
        setRestDayState(restRecord);

        if (!compRecord && !restRecord && isYesterday && latestChallenge) {
          const summary = await getChallengeSummary(db, latestChallenge, todayKey);
          if (!isMounted) return;
          if (
            localDate >= summary.startDate &&
            localDate <= summary.endDate &&
            summary.remainingRestQuota > 0
          ) {
            setCanMakeupRest(true);
            setTargetChallengeId(latestChallenge.id);
          } else {
            setCanMakeupRest(false);
            setTargetChallengeId(null);
          }
        } else {
          setCanMakeupRest(false);
          setTargetChallengeId(null);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [db, localDate, isYesterday, todayKey, refreshKey]);

  const handleCancelRest = async () => {
    if (!db || !localDate) return;
    await cancelRestDay(db, localDate);
    setRefreshKey((k) => k + 1);
  };

  const handleConfirmMakeup = async () => {
    if (!db || !localDate || !targetChallengeId) return;
    setShowMakeupConfirm(false);
    await setRestDay(db, localDate, targetChallengeId, new Date().toISOString());
    setRefreshKey((k) => k + 1);
  };

  const isCancellable = restDay ? isRestDayCancellable(restDay, todayKey) : false;

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
                ) : restDay ? (
                  <View style={styles.restBadge}>
                    <AppText variant="headline" weight="bold" style={styles.restText}>
                      休 休息日
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
          {restDay && isCancellable && (
            <Button
              variant="secondary"
              onPress={handleCancelRest}
              accessibilityLabel="取消休息"
              style={styles.actionButton}
            >
              取消休息
            </Button>
          )}

          {canMakeupRest && (
            <Button
              variant="primary"
              onPress={() => setShowMakeupConfirm(true)}
              accessibilityLabel="將昨天設為休息日"
              style={styles.actionButton}
            >
              將昨天設為休息日
            </Button>
          )}

          <Button
            variant="secondary"
            onPress={() => router.back()}
            accessibilityLabel="關閉"
          >
            關閉
          </Button>
        </View>

        {/* 補登確認對話框 */}
        <ConfirmDialog
          visible={showMakeupConfirm}
          title="將昨天設為休息日？"
          message="這將消耗 1 次休息額度，挑戰結束日保持不變。"
          confirmText="確認登記"
          cancelText="取消"
          onConfirm={handleConfirmMakeup}
          onCancel={() => setShowMakeupConfirm(false)}
        />
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
  restBadge: {
    backgroundColor: colors.restLight,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.rest,
    alignItems: 'center',
    width: '100%',
  },
  restText: {
    color: colors.rest,
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
    gap: spacing.sm,
  },
  actionButton: {
    marginBottom: spacing.xs,
  },
});
