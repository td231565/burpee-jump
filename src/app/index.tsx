import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { AppText } from '../components/ui/app-text';
import { Button } from '../components/ui/button';
import { colors, radius, spacing } from '../theme/tokens';
import {
  formatLocalDateKey,
  formatMonthDay,
  formatYearMonth,
} from '../features/calendar/date-utils';
import { getCompletionByDate } from '../data/completions';

export default function HomeScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const [isTodayCompleted, setIsTodayCompleted] = useState(false);

  const today = new Date();
  const todayKey = formatLocalDateKey(today);
  const currentMonthText = formatYearMonth(today);
  const todayDateText = formatMonthDay(today);

  useEffect(() => {
    let isMounted = true;
    async function loadTodayStatus() {
      if (!db) return;
      try {
        const record = await getCompletionByDate(db, todayKey);
        if (isMounted) {
          setIsTodayCompleted(!!record);
        }
      } catch {
        // 查詢失敗時維持未完成狀態
      }
    }
    loadTodayStatus();
    return () => {
      isMounted = false;
    };
  }, [db, todayKey]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        {/* 頁首顯示完整年份與月份 */}
        <View style={styles.header}>
          <AppText variant="title" style={styles.headerTitle}>
            {currentMonthText}
          </AppText>
        </View>

        {/* 今天資訊區塊 */}
        <View style={styles.content}>
          <View style={styles.todayCard}>
            <View style={styles.todayBadge}>
              <AppText variant="caption" weight="bold" style={styles.todayBadgeText}>
                今天
              </AppText>
            </View>
            <AppText variant="headline" style={styles.todayDateText}>
              {todayDateText}
            </AppText>
          </View>
        </View>

        {/* 底部主要操作 */}
        <View style={styles.footer}>
          <Button
            disabled={isTodayCompleted}
            variant={isTodayCompleted ? 'disabled' : 'primary'}
            onPress={() => router.push('/workout')}
            accessibilityLabel={isTodayCompleted ? '今天完成了' : '開始今天的 2 分鐘'}
          >
            {isTodayCompleted ? '今天完成了' : '開始今天的 2 分鐘'}
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
  },
  header: {
    paddingVertical: spacing.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: colors.ink,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.todayBorder,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.today,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 2,
  },
  todayBadge: {
    backgroundColor: colors.todayLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    marginBottom: spacing.sm,
  },
  todayBadgeText: {
    color: colors.today,
  },
  todayDateText: {
    color: colors.ink,
  },
  footer: {
    paddingVertical: spacing.base,
    paddingBottom: spacing.lg,
  },
});
