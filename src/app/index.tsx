import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { BookOpen, ChevronLeft, ChevronRight, Settings } from 'lucide-react-native';
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
import { SettingsModal } from '../features/settings/components/settings-modal';
import { TutorialModal } from '../features/onboarding/components/tutorial-modal';
import { OnboardingScreen } from '../features/onboarding/components/onboarding-screen';
import { IconButton } from '../components/ui/icon-button';
import { NatureBackdrop } from '../components/ui/nature-backdrop';
import { getCompletionByDate, getCompletionsForMonth } from '../data/completions';
import {
  getAudioPreferences,
  updateAudioPreferences,
  type AudioPreferences,
} from '../data/audio-preferences';
import { hasPresentedOnboarding, markOnboardingPresented } from '../data/onboarding';
import { getUserProfile, updateNickname } from '../data/profile';

export default function HomeScreen() {
  const router = useRouter();
  const db = useSQLiteContext();

  const [appState, setAppState] = useState<'loading' | 'onboarding' | 'home'>('loading');
  const [nickname, setNickname] = useState<string | null>(null);

  const [isTodayCompleted, setIsTodayCompleted] = useState(false);
  const [completionsMap, setCompletionsMap] = useState<Record<string, boolean>>({});
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [audioPreferences, setAudioPreferences] = useState<AudioPreferences>({
    voice_enabled: true,
    cues_enabled: true,
    music_enabled: true,
  });

  const [todayDate, setTodayDate] = useState(() => new Date());

  const [viewYear, setViewYear] = useState(() => todayDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(() => todayDate.getMonth() + 1);

  const isCurrentMonthView =
    viewYear === todayDate.getFullYear() && viewMonth === todayDate.getMonth() + 1;

  const currentMonthText = formatYearMonth(new Date(viewYear, viewMonth - 1, 1));

  // 啟動 gate：檢查 onboarding 呈現狀態與個人資料
  useEffect(() => {
    let isMounted = true;

    async function checkInitialState() {
      if (!db) return;
      try {
        const [hasPresented, profile] = await Promise.all([
          hasPresentedOnboarding(db),
          getUserProfile(db),
        ]);

        if (isMounted) {
          setNickname(profile.nickname);
          if (!hasPresented) {
            setAppState('onboarding');
          } else {
            setAppState('home');
          }
        }
      } catch {
        // 讀取 onboarding 狀態或個人資料失敗時，無提示降級至首頁
        if (isMounted) {
          setNickname(null);
          setAppState('home');
        }
      }
    }

    checkInitialState();

    return () => {
      isMounted = false;
    };
  }, [db]);

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
    const now = new Date();
    setTodayDate(now);
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth() + 1);
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

  const handleUpdateNickname = async (newNickname: string | null) => {
    if (!db) return;
    await updateNickname(db, newNickname);
    setNickname(newNickname);
  };

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      async function refreshData() {
        if (!db) return;
        const now = new Date();
        const currentKey = formatLocalDateKey(now);
        setTodayDate((prev) => {
          if (formatLocalDateKey(prev) !== currentKey) {
            return now;
          }
          return prev;
        });

        try {
          const { startDate, endDate } = getMonthDateRange(viewYear, viewMonth);
          const [todayRecord, monthRecords, prefs] = await Promise.all([
            getCompletionByDate(db, currentKey),
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
    }, [db, viewYear, viewMonth])
  );

  if (appState === 'loading') {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <NatureBackdrop />
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color={colors.primary}
            accessibilityLabel="載入中"
          />
        </View>
      </SafeAreaView>
    );
  }

  if (appState === 'onboarding') {
    return (
      <OnboardingScreen
        initialNickname={nickname}
        onSaveNickname={handleUpdateNickname}
        onMountStep={async () => {
          if (!db) return;
          try {
            await markOnboardingPresented(db);
          } catch {
            // best-effort，失敗不阻擋
          }
        }}
        onComplete={(finalNickname) => {
          setNickname(finalNickname);
          setAppState('home');
        }}
        onDismiss={() => {
          setAppState('home');
        }}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <NatureBackdrop />
      <View style={styles.container}>
        {/* 頁首：問候（若有）、月份導覽與操作列 */}
        <View style={styles.header}>
          {nickname && nickname.trim().length > 0 ? (
            <View style={styles.greetingContainer}>
              <AppText variant="title" style={styles.greetingText}>
                {`Hi，${nickname.trim()}`}
              </AppText>
            </View>
          ) : null}

          <View style={styles.headerNav}>
            <IconButton
              onPress={handlePrevMonth}
              accessibilityLabel="上一月"
            >
              <ChevronLeft size={24} color={colors.ink} strokeWidth={2} />
            </IconButton>
            <AppText variant="title" style={styles.headerTitle}>
              {currentMonthText}
            </AppText>
            <IconButton
              onPress={handleNextMonth}
              accessibilityLabel="下一月"
            >
              <ChevronRight size={24} color={colors.ink} strokeWidth={2} />
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
              onPress={() => setIsTutorialOpen(true)}
              accessibilityLabel="動作教學"
            >
              <BookOpen size={24} color={colors.ink} strokeWidth={2} />
            </IconButton>
            <IconButton
              onPress={() => setIsSettingsOpen(true)}
              accessibilityLabel="設定"
            >
              <Settings size={24} color={colors.ink} strokeWidth={2} />
            </IconButton>
          </View>
        </View>

        {/* 42 格月曆區塊 */}
        <View style={styles.content}>
          <MonthCalendar
            year={viewYear}
            month={viewMonth}
            today={todayDate}
            completionsMap={completionsMap}
            onSelectDate={handleSelectDate}
          />
        </View>

        {/* 動作教學 Modal */}
        <TutorialModal
          visible={isTutorialOpen}
          onClose={() => setIsTutorialOpen(false)}
        />

        {/* 設定 Modal */}
        <SettingsModal
          visible={isSettingsOpen}
          preferences={audioPreferences}
          onUpdatePreferences={handleUpdatePreferences}
          onLoadProfile={async () => {
            if (!db) return { nickname: null };
            return getUserProfile(db);
          }}
          onUpdateNickname={handleUpdateNickname}
          onClose={() => setIsSettingsOpen(false)}
          initialNickname={nickname}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    zIndex: 1,
    paddingHorizontal: spacing.base,
    justifyContent: 'space-between',
  },
  header: {
    paddingTop: spacing.base,
    paddingBottom: spacing.sm,
    alignItems: 'center',
  },
  greetingContainer: {
    width: '100%',
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.sm,
    alignItems: 'flex-start',
  },
  greetingText: {
    color: colors.ink,
    fontSize: 22,
    lineHeight: 28,
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
