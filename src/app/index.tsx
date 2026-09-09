import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { AppText } from '../components/ui/app-text';
import { Button } from '../components/ui/button';
import { colors, spacing } from '../theme/tokens';
import {
  formatLocalDateKey,
  formatYearMonth,
  getMonthDateRange,
  getNextMonth,
  getPreviousMonth,
} from '../features/calendar/date-utils';
import { MonthCalendar } from '../features/calendar/components/month-calendar';
import { AudioSettingsModal } from '../features/calendar/components/audio-settings-modal';
import { IconButton } from '../components/ui/icon-button';
import { getCompletionByDate, getCompletionsForMonth } from '../data/completions';
import {
  getAudioPreferences,
  updateAudioPreferences,
  type AudioPreferences,
} from '../data/audio-preferences';

export default function HomeScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const [isTodayCompleted, setIsTodayCompleted] = useState(false);
  const [completionsMap, setCompletionsMap] = useState<Record<string, boolean>>({});
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [audioPreferences, setAudioPreferences] = useState<AudioPreferences>({
    voice_enabled: true,
    cues_enabled: true,
    music_enabled: true,
  });

  const today = new Date();
  const todayKey = formatLocalDateKey(today);

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1);

  const isCurrentMonthView =
    viewYear === today.getFullYear() && viewMonth === today.getMonth() + 1;

  const currentMonthText = formatYearMonth(new Date(viewYear, viewMonth - 1, 1));

  const handlePrevMonth = () => {
    const prev = getPreviousMonth(viewYear, viewMonth);
    setViewYear(prev.year);
    setViewMonth(prev.month);
  };

  const handleNextMonth = () => {
    const next = getNextMonth(viewYear, viewMonth);
    setViewYear(next.year);
    setViewMonth(next.month);
  };

  const handleBackToToday = () => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth() + 1);
  };

  const handleSelectDate = (date: string) => {
    router.push({
      pathname: '/day',
      params: { date },
    });
  };

  const handleUpdatePreferences = async (newPrefs: AudioPreferences) => {
    setAudioPreferences(newPrefs);
    if (db) {
      try {
        await updateAudioPreferences(db, newPrefs);
      } catch {
        // 偏好寫入失敗維持原狀
      }
    }
  };

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      async function refreshData() {
        if (!db) return;
        try {
          const { startDate, endDate } = getMonthDateRange(viewYear, viewMonth);
          const [todayRecord, monthRecords, prefs] = await Promise.all([
            getCompletionByDate(db, todayKey),
            getCompletionsForMonth(db, startDate, endDate),
            getAudioPreferences(db),
          ]);

          if (isMounted) {
            setIsTodayCompleted(!!todayRecord);
            setAudioPreferences(prefs);
            const map: Record<string, boolean> = {};
            monthRecords.forEach((r) => {
              map[r.local_date] = true;
            });
            setCompletionsMap(map);
          }
        } catch {
          // 查詢失敗維持原狀
        }
      }

      refreshData();

      return () => {
        isMounted = false;
      };
    }, [db, todayKey, viewYear, viewMonth])
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        {/* 頁首顯示完整年份、月份、導航按鈕與今天按鈕 */}
        <View style={styles.header}>
          <View style={styles.headerNav}>
            <IconButton
              onPress={handlePrevMonth}
              accessibilityLabel="上一月"
            >
              ‹
            </IconButton>
            <AppText variant="title" style={styles.headerTitle}>
              {currentMonthText}
            </AppText>
            <IconButton
              onPress={handleNextMonth}
              accessibilityLabel="下一月"
            >
              ›
            </IconButton>
          </View>
          <View style={styles.headerActions}>
            <Button
              variant="secondary"
              onPress={handleBackToToday}
              accessibilityLabel="今天"
              style={styles.todayButton}
            >
              今天
            </Button>
            <IconButton
              onPress={() => setIsSettingsOpen(true)}
              accessibilityLabel="設定"
            >
              ⚙
            </IconButton>
          </View>
        </View>

        {/* 42 格月曆區塊 */}
        <View style={styles.content}>
          <MonthCalendar
            year={viewYear}
            month={viewMonth}
            today={today}
            completionsMap={completionsMap}
            onSelectDate={handleSelectDate}
          />
        </View>

        {/* 音訊設定 Modal */}
        <AudioSettingsModal
          visible={isSettingsOpen}
          preferences={audioPreferences}
          onUpdatePreferences={handleUpdatePreferences}
          onClose={() => setIsSettingsOpen(false)}
        />

        {/* 底部主要操作：目前月份為開始/已完成，非目前月份為回到今天 */}
        <View style={styles.footer}>
          {isCurrentMonthView ? (
            <Button
              disabled={isTodayCompleted}
              variant={isTodayCompleted ? 'disabled' : 'primary'}
              onPress={() => router.push('/workout')}
              accessibilityLabel={isTodayCompleted ? '今天完成了' : '開始今天的 2 分鐘'}
            >
              {isTodayCompleted ? '今天完成了' : '開始今天的 2 分鐘'}
            </Button>
          ) : (
            <Button
              variant="primary"
              onPress={handleBackToToday}
              accessibilityLabel="回到今天"
            >
              回到今天
            </Button>
          )}
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
    paddingTop: spacing.base,
    paddingBottom: spacing.sm,
    alignItems: 'center',
  },
  headerNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: spacing.xs,
  },
  headerTitle: {
    color: colors.ink,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  todayButton: {
    minHeight: 44,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.base,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  footer: {
    paddingVertical: spacing.base,
    paddingBottom: spacing.lg,
  },
});
