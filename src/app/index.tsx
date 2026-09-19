import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  AppState,
  type AppStateStatus,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { BookOpen, Calendar, ChevronLeft, ChevronRight, Home, Settings } from 'lucide-react-native';
import { AppText } from '../components/ui/app-text';
import { Button } from '../components/ui/button';
import { IconButton } from '../components/ui/icon-button';
import { NatureBackdrop } from '../components/ui/nature-backdrop';
import { colors, radius, spacing } from '../theme/tokens';
import {
  addDays,
  calculateStreak,
  formatDetailDate,
  formatLocalDateKey,
  formatYearMonth,
  getMonthDateRange,
  getNextMonth,
  getPreviousMonth,
  getYesterday,
} from '../features/calendar/date-utils';
import { MonthCalendar } from '../features/calendar/components/month-calendar';
import { SettingsModal } from '../features/settings/components/settings-modal';
import { TutorialModal } from '../features/onboarding/components/tutorial-modal';
import { OnboardingScreen } from '../features/onboarding/components/onboarding-screen';
import { getCompletionByDate, getCompletionsForMonth } from '../data/completions';
import {
  getAudioPreferences,
  updateAudioPreferences,
  type AudioPreferences,
} from '../data/audio-preferences';
import { hasPresentedOnboarding, markOnboardingPresented } from '../data/onboarding';
import { getUserProfile, updateNickname } from '../data/profile';
import {
  getActiveChallenge,
  getChallengeSummary,
  getUnsettledEndedChallenge,
} from '../data/challenges';
import {
  cancelRestDay,
  getRestDayByDate,
  getRestDaysForRange,
  setRestDay,
} from '../data/rest-days';
import {
  evaluateSettlement,
  persistSettlement,
} from '../features/challenge/settlement-service';
import { RescueDialog } from '../features/challenge/components/rescue-dialog';
import { SettlementModal } from '../features/challenge/components/settlement-modal';
import type {
  Challenge,
  ChallengeSummary,
  SettlementOutcome,
} from '../data/challenge-types';

// 記憶體中單次執行提示旗標（不入庫）
let hasShownSettlementToastInSession = false;

export default function HomeScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const params = useLocalSearchParams<{ completedLocalDate?: string }>();

  const [appState, setAppState] = useState<'loading' | 'onboarding' | 'home'>('loading');
  const [nickname, setNickname] = useState<string | null>(null);

  // 頁面狀態：0 為首頁，1 為日曆
  const [currentPage, setCurrentPage] = useState<0 | 1>(0);
  const [pagerHeight, setPagerHeight] = useState<number>(0);
  const pagerRef = useRef<ScrollView>(null);

  const [todayDate, setTodayDate] = useState(() => new Date());
  const currentKeyRef = useRef(formatLocalDateKey(todayDate));

  // 今日狀態：loading | pending | completed | rest | unavailable
  const [todayStatus, setTodayStatus] = useState<
    'loading' | 'pending' | 'completed' | 'rest' | 'unavailable'
  >('loading');
  const todayTrustedStateRef = useRef<
    Record<string, 'pending' | 'completed' | 'rest'>
  >({});

  // 月曆紀錄狀態：loading | ready | unavailable
  const [monthStatus, setMonthStatus] = useState<'loading' | 'ready' | 'unavailable'>('loading');
  const [completionsMap, setCompletionsMap] = useState<Record<string, boolean>>({});
  const [restDaysMap, setRestDaysMap] = useState<Record<string, boolean>>({});
  const monthTrustedDataRef = useRef<Record<string, boolean>>({});

  // 挑戰與連續天數狀態
  const [challengeSummary, setChallengeSummary] = useState<ChallengeSummary | null>(null);
  const [streak, setStreak] = useState(0);
  const [isGentleRecovery, setIsGentleRecovery] = useState(false);
  const [pendingActionDate, setPendingActionDate] = useState<string | null>(null);

  // 一次性結算與補登挽救對話框
  const [isRescueDialogOpen, setIsRescueDialogOpen] = useState(false);
  const [rescueTarget, setRescueTarget] = useState<{
    challenge: Challenge;
    lastDate: string;
  } | null>(null);
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
  const [settlementOutcome, setSettlementOutcome] = useState<SettlementOutcome>('completed');

  // Toast 狀態
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [viewYear, setViewYear] = useState(() => todayDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(() => todayDate.getMonth() + 1);
  const viewYearRef = useRef(viewYear);
  const viewMonthRef = useRef(viewMonth);
  useEffect(() => {
    viewYearRef.current = viewYear;
    viewMonthRef.current = viewMonth;
  }, [viewYear, viewMonth]);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [audioPreferences, setAudioPreferences] = useState<AudioPreferences>({
    voice_enabled: true,
    cues_enabled: true,
    music_enabled: true,
  });

  const isCurrentMonthView =
    viewYear === todayDate.getFullYear() && viewMonth === todayDate.getMonth() + 1;

  const currentMonthText = formatYearMonth(new Date(viewYear, viewMonth - 1, 1));

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  }, []);

  // 獨立查詢今日狀態
  const fetchTodayStatus = useCallback(async (database: any, dateKey: string, forceFresh = false) => {
    setTodayStatus('loading');
    if (forceFresh) {
      delete todayTrustedStateRef.current[dateKey];
    }
    try {
      const comp = await getCompletionByDate(database, dateKey);
      if (comp) {
        todayTrustedStateRef.current[dateKey] = 'completed';
        setTodayStatus('completed');
        return;
      }
      const rest = await getRestDayByDate(database, dateKey);
      if (rest) {
        todayTrustedStateRef.current[dateKey] = 'rest';
        setTodayStatus('rest');
        return;
      }
      todayTrustedStateRef.current[dateKey] = 'pending';
      setTodayStatus('pending');
    } catch {
      const trusted = todayTrustedStateRef.current[dateKey];
      if (trusted) {
        setTodayStatus(trusted);
      } else {
        setTodayStatus('unavailable');
      }
    }
  }, []);

  // 查詢當月完成與休息紀錄
  const fetchMonthCompletions = useCallback(async (database: any, year: number, month: number) => {
    const monthKey = `${year}-${month}`;
    setMonthStatus('loading');
    try {
      const { startDate, endDate } = getMonthDateRange(year, month);
      const [monthRecords, restRecords] = await Promise.all([
        getCompletionsForMonth(database, startDate, endDate),
        getRestDaysForRange(database, startDate, endDate),
      ]);
      const compMap: Record<string, boolean> = {};
      monthRecords.forEach((r) => {
        compMap[r.local_date] = true;
      });
      const rMap: Record<string, boolean> = {};
      restRecords.forEach((r) => {
        rMap[r.local_date] = true;
      });
      setCompletionsMap(compMap);
      setRestDaysMap(rMap);
      monthTrustedDataRef.current[monthKey] = true;
      setMonthStatus('ready');
    } catch {
      if (monthTrustedDataRef.current[monthKey]) {
        setMonthStatus('ready');
      } else {
        setMonthStatus('unavailable');
      }
    }
  }, []);

  // 查詢挑戰與連續天數
  const fetchChallengeAndStreak = useCallback(
    async (database: any, currentKey: string, isCompleted: boolean) => {
      try {
        const active = await getActiveChallenge(database, currentKey);
        let summary: ChallengeSummary | null = null;
        if (active) {
          summary = await getChallengeSummary(database, active, currentKey);
          setChallengeSummary(summary);
        } else {
          setChallengeSummary(null);
        }

        // 計算連續訓練天數 (回溯 365 天)
        const rangeStart = addDays(currentKey, -365);
        const [comps, rests] = await Promise.all([
          getCompletionsForMonth(database, rangeStart, currentKey),
          getRestDaysForRange(database, rangeStart, currentKey),
        ]);
        const compSet = new Set(comps.map((c) => c.local_date));
        const restSet = new Set(rests.map((r) => r.local_date));

        const streakVal = calculateStreak({
          completedDates: compSet,
          restDates: restSet,
          todayKey: currentKey,
          isTodayCompleted: isCompleted,
        });
        setStreak(streakVal);

        // 溫和復歸與可補登操作檢查
        const yesterdayKey = getYesterday(currentKey);
        const yesterdayHasRecord = compSet.has(yesterdayKey) || restSet.has(yesterdayKey);

        if (summary && !summary.isEnded) {
          const yesterdayInChallenge =
            yesterdayKey >= summary.startDate && yesterdayKey <= summary.endDate;

          if (yesterdayInChallenge && !yesterdayHasRecord) {
            setIsGentleRecovery(true);
            if (summary.remainingRestQuota > 0) {
              setPendingActionDate(yesterdayKey);
            } else {
              setPendingActionDate(null);
            }
          } else {
            setIsGentleRecovery(false);
            setPendingActionDate(null);
          }
        } else {
          setIsGentleRecovery(false);
          setPendingActionDate(null);
        }
      } catch {
        setChallengeSummary(null);
        setStreak(0);
        setIsGentleRecovery(false);
        setPendingActionDate(null);
      }
    },
    []
  );

  // 結算檢查（僅在首頁、非操作中觸發）
  const checkSettlement = useCallback(
    async (database: any, currentKey: string) => {
      try {
        const unsettled = await getUnsettledEndedChallenge(database, currentKey);
        if (!unsettled) return;

        const evalResult = await evaluateSettlement(database, unsettled, currentKey);
        if (evalResult.canRescue) {
          setRescueTarget({
            challenge: unsettled,
            lastDate: evalResult.lastDate,
          });
          setIsRescueDialogOpen(true);
        } else {
          const persisted = await persistSettlement(database, unsettled.id);
          if (persisted) {
            setSettlementOutcome(evalResult.outcome);
            setIsSettlementModalOpen(true);
          } else {
            if (!hasShownSettlementToastInSession) {
              hasShownSettlementToastInSession = true;
              showToast('挑戰結算中');
            }
          }
        }
      } catch {
        // 靜默
      }
    },
    [showToast]
  );

  const fetchAudioPreferences = useCallback(async (database: any) => {
    try {
      const prefs = await getAudioPreferences(database);
      setAudioPreferences(prefs);
    } catch {
      // 靜默
    }
  }, []);

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

  // 處理返回傳入的 completedLocalDate 與 focus 刷新
  const handledCompletedDateRef = useRef<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!db) return;

      const now = new Date();
      const currentKey = formatLocalDateKey(now);
      setTodayDate((prev) => {
        if (formatLocalDateKey(prev) !== currentKey) {
          return now;
        }
        return prev;
      });
      currentKeyRef.current = currentKey;

      if (
        params.completedLocalDate &&
        params.completedLocalDate !== handledCompletedDateRef.current
      ) {
        handledCompletedDateRef.current = params.completedLocalDate;
        const [yStr, mStr] = params.completedLocalDate.split('-');
        const compYear = parseInt(yStr, 10);
        const compMonth = parseInt(mStr, 10);
        const targetYear = !isNaN(compYear) ? compYear : viewYearRef.current;
        const targetMonth = !isNaN(compMonth) ? compMonth : viewMonthRef.current;
        if (!isNaN(compYear) && !isNaN(compMonth)) {
          setViewYear(compYear);
          setViewMonth(compMonth);
        }
        fetchTodayStatus(db, currentKey, true).then(() => {
          fetchChallengeAndStreak(db, currentKey, true);
        });
        fetchMonthCompletions(db, targetYear, targetMonth);
        fetchAudioPreferences(db);
        checkSettlement(db, currentKey);
      } else {
        fetchTodayStatus(db, currentKey).then(() => {
          fetchChallengeAndStreak(
            db,
            currentKey,
            todayTrustedStateRef.current[currentKey] === 'completed'
          );
        });
        fetchMonthCompletions(db, viewYearRef.current, viewMonthRef.current);
        fetchAudioPreferences(db);
        checkSettlement(db, currentKey);
      }
    }, [
      db,
      fetchTodayStatus,
      fetchMonthCompletions,
      fetchChallengeAndStreak,
      fetchAudioPreferences,
      checkSettlement,
      params.completedLocalDate,
    ])
  );

  // AppState 監聽：回到 active 時若跨日才刷新
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && db) {
        const now = new Date();
        const nowKey = formatLocalDateKey(now);
        if (nowKey !== currentKeyRef.current) {
          currentKeyRef.current = nowKey;
          setTodayDate(now);
          fetchTodayStatus(db, nowKey, true).then(() => {
            fetchChallengeAndStreak(
              db,
              nowKey,
              todayTrustedStateRef.current[nowKey] === 'completed'
            );
          });
          fetchMonthCompletions(db, viewYear, viewMonth);
          fetchAudioPreferences(db);
          checkSettlement(db, nowKey);
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [
    db,
    viewYear,
    viewMonth,
    fetchTodayStatus,
    fetchMonthCompletions,
    fetchChallengeAndStreak,
    fetchAudioPreferences,
    checkSettlement,
  ]);

  const handlePrevMonth = () => {
    const prev = getPreviousMonth(viewYear, viewMonth);
    setViewYear(prev.year);
    setViewMonth(prev.month);
    if (db) {
      fetchMonthCompletions(db, prev.year, prev.month);
    }
  };

  const handleNextMonth = () => {
    const next = getNextMonth(viewYear, viewMonth);
    setViewYear(next.year);
    setViewMonth(next.month);
    if (db) {
      fetchMonthCompletions(db, next.year, next.month);
    }
  };

  const handleBackToToday = () => {
    const now = new Date();
    setTodayDate(now);
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    setViewYear(y);
    setViewMonth(m);
    if (db) {
      fetchMonthCompletions(db, y, m);
    }
  };

  const handleSelectDate = (date: string) => {
    router.push({
      pathname: '/day',
      params: { date },
    });
  };

  const handlePageChange = (targetPage: 0 | 1) => {
    if (currentPage !== targetPage) {
      setCurrentPage(targetPage);
      if (pagerHeight > 0) {
        pagerRef.current?.scrollTo({
          y: targetPage * pagerHeight,
          animated: true,
        });
      }
      AccessibilityInfo.announceForAccessibility?.(
        targetPage === 0 ? '首頁，第 1 頁，共 2 頁' : '日曆，第 2 頁，共 2 頁'
      );
    }
  };

  const handleScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (pagerHeight <= 0) return;
    const offsetY = e.nativeEvent.contentOffset.y;
    const page = Math.round(offsetY / pagerHeight) as 0 | 1;
    const targetPage = page >= 1 ? 1 : 0;
    if (targetPage !== currentPage) {
      setCurrentPage(targetPage);
      AccessibilityInfo.announceForAccessibility?.(
        targetPage === 0 ? '首頁，第 1 頁，共 2 頁' : '日曆，第 2 頁，共 2 頁'
      );
    }
  };

  const handleUpdatePreferences = async (newPrefs: AudioPreferences) => {
    setAudioPreferences(newPrefs);
    if (db) {
      try {
        await updateAudioPreferences(db, newPrefs);
      } catch {
        // 忽略
      }
    }
  };

  const handleUpdateNickname = async (newNickname: string | null) => {
    if (!db) return;
    await updateNickname(db, newNickname);
    setNickname(newNickname);
  };

  // 當日設定休息
  const handleSetTodayRest = async () => {
    if (!db || !challengeSummary) return;
    const currentKey = formatLocalDateKey(todayDate);
    await setRestDay(
      db,
      currentKey,
      challengeSummary.challenge.id,
      new Date().toISOString()
    );
    await fetchTodayStatus(db, currentKey, true);
    await fetchChallengeAndStreak(db, currentKey, false);
    await fetchMonthCompletions(db, viewYearRef.current, viewMonthRef.current);
  };

  // 當日取消休息
  const handleCancelTodayRest = async () => {
    if (!db) return;
    const currentKey = formatLocalDateKey(todayDate);
    await cancelRestDay(db, currentKey);
    await fetchTodayStatus(db, currentKey, true);
    await fetchChallengeAndStreak(db, currentKey, false);
    await fetchMonthCompletions(db, viewYearRef.current, viewMonthRef.current);
  };

  // 補登挽救對話框：是
  const handleRescueConfirm = async (): Promise<boolean> => {
    if (!db || !rescueTarget) return false;
    const currentKey = formatLocalDateKey(new Date());
    const yesterdayKey = getYesterday(currentKey);

    const isStillYesterday = rescueTarget.lastDate === yesterdayKey;
    if (isStillYesterday) {
      try {
        await setRestDay(
          db,
          rescueTarget.lastDate,
          rescueTarget.challenge.id,
          new Date().toISOString()
        );
      } catch {
        return false;
      }
    }

    const persisted = await persistSettlement(db, rescueTarget.challenge.id);
    if (!persisted) return false;

    setIsRescueDialogOpen(false);
    setSettlementOutcome(isStillYesterday ? 'completed' : 'uncompleted');
    setIsSettlementModalOpen(true);
    setRescueTarget(null);

    fetchTodayStatus(db, currentKey, true);
    fetchMonthCompletions(db, viewYearRef.current, viewMonthRef.current);
    fetchChallengeAndStreak(db, currentKey, false);
    return true;
  };

  // 補登挽救對話框：否
  const handleRescueDecline = async () => {
    if (!db || !rescueTarget) return;
    setIsRescueDialogOpen(false);
    const persisted = await persistSettlement(db, rescueTarget.challenge.id);
    if (persisted) {
      setSettlementOutcome('uncompleted');
      setIsSettlementModalOpen(true);
    }
    setRescueTarget(null);
  };

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
            // best-effort
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
      <View
        style={styles.pagerContainer}
        onLayout={(e) => {
          const h = e.nativeEvent.layout.height;
          if (h > 0) setPagerHeight(h);
        }}
      >
        {/* 側邊兩段導覽條 - 絕對定位於 pager 右上方 */}
        <View style={styles.sideNav}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="首頁，第 1 頁，共 2 頁"
            accessibilityState={{ selected: currentPage === 0 }}
            style={[
              styles.navSegment,
              currentPage === 0 && styles.navSegmentSelected,
            ]}
            onPress={() => handlePageChange(0)}
          >
            <Home
              size={20}
              color={currentPage === 0 ? colors.primary : colors.muted}
              strokeWidth={currentPage === 0 ? 2.5 : 2}
            />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="日曆，第 2 頁，共 2 頁"
            accessibilityState={{ selected: currentPage === 1 }}
            style={[
              styles.navSegment,
              currentPage === 1 && styles.navSegmentSelected,
            ]}
            onPress={() => handlePageChange(1)}
          >
            <Calendar
              size={20}
              color={currentPage === 1 ? colors.primary : colors.muted}
              strokeWidth={currentPage === 1 ? 2.5 : 2}
            />
          </Pressable>
        </View>

        {/* 垂直 Pager */}
        <ScrollView
          ref={pagerRef}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onMomentumScrollEnd={handleScrollEnd}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Page 0: 首頁 */}
          <View
            style={[styles.page, pagerHeight > 0 && { height: pagerHeight }]}
            accessibilityElementsHidden={currentPage !== 0}
            importantForAccessibility={currentPage === 0 ? 'auto' : 'no-hide-descendants'}
          >
            {/* 首頁頂部列：左上方並列 BookOpen 與 Settings */}
            <View style={styles.homeTopBar}>
              <View style={styles.homeTopActions}>
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

            {/* 暱稱問候：有暱稱時顯示，沒有時不渲染 */}
            {nickname && nickname.trim().length > 0 ? (
              <View style={styles.greetingContainer}>
                <AppText variant="title" style={styles.greetingText}>
                  {`Hi，${nickname.trim()}`}
                </AppText>
              </View>
            ) : null}

            {/* 進行中挑戰摘要 */}
            {challengeSummary && !challengeSummary.isEnded && (
              <View style={styles.challengeSummaryBanner}>
                <AppText variant="body" weight="medium" style={styles.challengeSummaryText}>
                  {`挑戰還有 ${challengeSummary.remainingDays} 天，剩餘休息 ${challengeSummary.remainingRestQuota} 天`}
                </AppText>
              </View>
            )}

            {/* 首頁中間核心區：完整年月日與狀態 */}
            <View style={styles.homeCenter}>
              <View style={styles.todayStatusCard}>
                <AppText variant="headline" style={styles.todayDateText}>
                  {formatDetailDate(formatLocalDateKey(todayDate))}
                </AppText>

                {todayStatus === 'loading' && (
                  <View style={styles.statusRow}>
                    <ActivityIndicator
                      size="small"
                      color={colors.primary}
                      accessibilityLabel="載入今日狀態中"
                    />
                  </View>
                )}

                {todayStatus === 'pending' && (
                  <View style={styles.statusRow}>
                    <AppText variant="title" style={styles.pendingStatusText}>
                      今日待完成
                    </AppText>
                  </View>
                )}

                {todayStatus === 'rest' && (
                  <View style={styles.statusRow}>
                    <AppText variant="title" style={styles.restStatusText}>
                      今日為休息日
                    </AppText>
                  </View>
                )}

                {todayStatus === 'completed' && (
                  <View style={styles.statusRow}>
                    <AppText variant="title" style={styles.completedStatusText}>
                      今日已完成
                    </AppText>
                  </View>
                )}

                {todayStatus === 'unavailable' && (
                  <View style={styles.statusRow}>
                    <AppText variant="title" style={styles.errorStatusText}>
                      暫時無法讀取今日紀錄
                    </AppText>
                  </View>
                )}
              </View>
            </View>

            {/* 首頁底部操作區 */}
            <View style={styles.homeFooter}>
              {/* 溫和復歸提示 */}
              {isGentleRecovery && todayStatus === 'pending' && (
                <AppText variant="body" style={styles.recoveryText}>
                  今天重新開始
                </AppText>
              )}

              {todayStatus === 'loading' && (
                <Button
                  disabled
                  variant="disabled"
                  accessibilityLabel="開始今天的 2 分鐘"
                >
                  開始今天的 2 分鐘
                </Button>
              )}

              {todayStatus === 'pending' && (
                <View style={styles.footerActionGroup}>
                  <Button
                    variant="primary"
                    onPress={() => router.push('/workout')}
                    accessibilityLabel="開始今天的 2 分鐘"
                    style={styles.actionButton}
                  >
                    開始今天的 2 分鐘
                  </Button>

                  {challengeSummary && !challengeSummary.isEnded ? (
                    challengeSummary.remainingRestQuota > 0 ? (
                      <Button
                        variant="secondary"
                        onPress={handleSetTodayRest}
                        accessibilityLabel="把今天設為休息日"
                        style={styles.actionButton}
                      >
                        把今天設為休息日
                      </Button>
                    ) : (
                      <AppText variant="caption" style={styles.quotaEmptyText}>
                        休息額度已用完
                      </AppText>
                    )
                  ) : (
                    <Button
                      variant="secondary"
                      onPress={() => router.push('/challenge' as any)}
                      accessibilityLabel="開始挑戰"
                      style={styles.actionButton}
                    >
                      開始挑戰
                    </Button>
                  )}
                </View>
              )}

              {todayStatus === 'rest' && (
                <View style={styles.footerActionGroup}>
                  <Button
                    variant="primary"
                    onPress={() => router.push('/workout')}
                    accessibilityLabel="開始今天的 2 分鐘"
                    style={styles.actionButton}
                  >
                    開始今天的 2 分鐘
                  </Button>
                  <Button
                    variant="secondary"
                    onPress={handleCancelTodayRest}
                    accessibilityLabel="取消休息"
                    style={styles.actionButton}
                  >
                    取消休息
                  </Button>
                </View>
              )}

              {todayStatus === 'completed' && (
                <View style={styles.footerActionGroup}>
                  <Button
                    variant="primary"
                    onPress={() =>
                      router.push({
                        pathname: '/workout',
                        params: { mode: 'unrecorded' },
                      })
                    }
                    accessibilityLabel="再做一次"
                    style={styles.actionButton}
                  >
                    再做一次
                  </Button>

                  {!challengeSummary || challengeSummary.isEnded ? (
                    <Button
                      variant="secondary"
                      onPress={() => router.push('/challenge' as any)}
                      accessibilityLabel="開始挑戰"
                      style={styles.actionButton}
                    >
                      開始挑戰
                    </Button>
                  ) : null}
                </View>
              )}

              {todayStatus === 'unavailable' && (
                <View style={styles.unavailableBlock}>
                  <Button
                    variant="primary"
                    onPress={() => {
                      if (db) fetchTodayStatus(db, formatLocalDateKey(todayDate));
                    }}
                    accessibilityLabel="重新載入"
                    style={styles.retryButton}
                  >
                    重新載入
                  </Button>
                  <Button
                    variant="secondary"
                    onPress={() =>
                      router.push({
                        pathname: '/workout',
                        params: { mode: 'unrecorded' },
                      })
                    }
                    accessibilityLabel="開始訓練"
                    style={styles.unrecordedButton}
                  >
                    開始訓練
                  </Button>
                  <AppText variant="caption" style={styles.unrecordedHint}>
                    目前無法確認今天是否已有紀錄。若直接開始，本次訓練不會被記錄。
                  </AppText>
                </View>
              )}
            </View>
          </View>

          {/* Page 1: 日曆 */}
          <View
            style={[styles.page, pagerHeight > 0 && { height: pagerHeight }]}
            accessibilityElementsHidden={currentPage !== 1}
            importantForAccessibility={currentPage === 1 ? 'auto' : 'no-hide-descendants'}
          >
            {/* 日曆頂部列：上一月、月份、下一月 */}
            <View style={styles.calendarHeader}>
              <View style={styles.calendarNavRow}>
                <IconButton
                  onPress={handlePrevMonth}
                  accessibilityLabel="上一月"
                >
                  <ChevronLeft size={24} color={colors.ink} strokeWidth={2} />
                </IconButton>
                <AppText variant="title" style={styles.calendarHeaderTitle}>
                  {currentMonthText}
                </AppText>
                <IconButton
                  onPress={handleNextMonth}
                  accessibilityLabel="下一月"
                >
                  <ChevronRight size={24} color={colors.ink} strokeWidth={2} />
                </IconButton>
              </View>

              {/* 連續訓練天數與挑戰期間資訊 */}
              <View style={styles.calendarStreakRow}>
                <AppText variant="body" weight="bold" style={styles.calendarStreakText}>
                  {`已連續訓練 ${streak} 天`}
                </AppText>
                {challengeSummary && !challengeSummary.isEnded && (
                  <AppText variant="caption" style={styles.calendarChallengeInfoText}>
                    {`挑戰期間：${formatDetailDate(challengeSummary.startDate)} 至 ${formatDetailDate(challengeSummary.endDate)}（剩餘休息 ${challengeSummary.remainingRestQuota} 天）`}
                  </AppText>
                )}
              </View>

              {!isCurrentMonthView && (
                <View style={styles.calendarTodayActionRow}>
                  <Button
                    variant="secondary"
                    onPress={handleBackToToday}
                    accessibilityLabel="回到今天"
                    style={styles.todayButton}
                  >
                    回到今天
                  </Button>
                </View>
              )}
            </View>

            {/* 42 格月曆區塊 */}
            <View style={styles.calendarContent}>
              {monthStatus === 'unavailable' ? (
                <View style={styles.monthErrorContainer}>
                  <AppText variant="body" style={styles.monthErrorText}>
                    暫時無法讀取月曆紀錄
                  </AppText>
                  <Button
                    variant="secondary"
                    onPress={() => {
                      if (db) fetchMonthCompletions(db, viewYear, viewMonth);
                    }}
                    accessibilityLabel="重新載入"
                    style={styles.retryButton}
                  >
                    重新載入
                  </Button>
                </View>
              ) : (
                <View style={styles.monthCalendarWrapper}>
                  {monthStatus === 'loading' && (
                    <View
                      style={styles.calendarLoadingOverlay}
                      pointerEvents="none"
                      accessibilityElementsHidden={true}
                      importantForAccessibility="no-hide-descendants"
                    >
                      <ActivityIndicator
                        size="small"
                        color={colors.primary}
                        accessibilityLabel="載入月曆中"
                      />
                    </View>
                  )}
                  <View
                    pointerEvents={monthStatus === 'loading' ? 'none' : 'auto'}
                    accessibilityElementsHidden={monthStatus === 'loading'}
                    importantForAccessibility={monthStatus === 'loading' ? 'no-hide-descendants' : 'auto'}
                  >
                    <MonthCalendar
                      year={viewYear}
                      month={viewMonth}
                      today={todayDate}
                      completionsMap={completionsMap}
                      restDaysMap={restDaysMap}
                      challengeStartDate={challengeSummary && !challengeSummary.isEnded ? challengeSummary.startDate : null}
                      challengeEndDate={challengeSummary && !challengeSummary.isEnded ? challengeSummary.endDate : null}
                      pendingActionDate={pendingActionDate}
                      onSelectDate={handleSelectDate}
                    />
                  </View>
                </View>
              )}
            </View>
          </View>
        </ScrollView>

        {/* 非阻擋式 Toast */}
        {toastMessage && (
          <View style={styles.toastContainer} accessibilityRole="alert" accessibilityLiveRegion="polite">
            <AppText variant="caption" style={styles.toastText}>
              {toastMessage}
            </AppText>
          </View>
        )}

        {/* 補登挽救對話框 */}
        <RescueDialog
          visible={isRescueDialogOpen}
          onConfirm={handleRescueConfirm}
          onDecline={handleRescueDecline}
        />

        {/* 滿版結算畫面 */}
        <SettlementModal
          visible={isSettlementModalOpen}
          outcome={settlementOutcome}
          onClose={() => setIsSettlementModalOpen(false)}
        />

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
  pagerContainer: {
    flex: 1,
    position: 'relative',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  page: {
    flex: 1,
    paddingHorizontal: spacing.base,
    justifyContent: 'space-between',
  },
  sideNav: {
    position: 'absolute',
    top: spacing.base,
    right: spacing.base,
    zIndex: 10,
    flexDirection: 'column',
    gap: spacing.xs,
    alignItems: 'center',
  },
  navSegment: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  navSegmentSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(56, 102, 65, 0.08)',
  },
  homeTopBar: {
    paddingTop: spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 52,
  },
  homeTopActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  greetingContainer: {
    width: '100%',
    paddingHorizontal: spacing.xs,
    marginTop: spacing.sm,
    alignItems: 'flex-start',
  },
  greetingText: {
    color: colors.ink,
    fontSize: 22,
    lineHeight: 28,
  },
  challengeSummaryBanner: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  challengeSummaryText: {
    color: colors.ink,
  },
  homeCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
  },
  todayStatusCard: {
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  todayDateText: {
    color: colors.ink,
    marginBottom: spacing.base,
    textAlign: 'center',
  },
  statusRow: {
    minHeight: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pendingStatusText: {
    color: colors.work,
    fontWeight: '600',
  },
  restStatusText: {
    color: colors.rest,
    fontWeight: '600',
  },
  completedStatusText: {
    color: colors.today,
    fontWeight: '600',
  },
  errorStatusText: {
    color: colors.rest,
    fontWeight: '600',
  },
  homeFooter: {
    paddingVertical: spacing.base,
    paddingBottom: spacing.lg,
  },
  footerActionGroup: {
    gap: spacing.sm,
  },
  recoveryText: {
    color: colors.muted,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  quotaEmptyText: {
    color: colors.muted,
    textAlign: 'center',
    paddingVertical: spacing.xs,
  },
  actionButton: {
    width: '100%',
    minHeight: 48,
  },
  unavailableBlock: {
    gap: spacing.sm,
  },
  retryButton: {
    marginBottom: spacing.xs,
  },
  unrecordedButton: {
    marginBottom: spacing.xs,
  },
  unrecordedHint: {
    color: colors.muted,
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
  },
  calendarHeader: {
    paddingTop: spacing.base,
    paddingBottom: spacing.sm,
    paddingRight: 52,
    alignItems: 'center',
  },
  calendarNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: spacing.xs,
  },
  calendarHeaderTitle: {
    color: colors.ink,
  },
  calendarStreakRow: {
    alignItems: 'center',
    marginVertical: spacing.xs,
    gap: spacing.xs,
  },
  calendarStreakText: {
    color: colors.success,
  },
  calendarChallengeInfoText: {
    color: colors.muted,
    textAlign: 'center',
  },
  calendarTodayActionRow: {
    marginTop: spacing.xs,
  },
  todayButton: {
    minHeight: 44,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.base,
  },
  calendarContent: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: spacing.lg,
  },
  monthCalendarWrapper: {
    position: 'relative',
  },
  calendarLoadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  monthErrorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.base,
  },
  monthErrorText: {
    color: colors.rest,
    textAlign: 'center',
  },
  toastContainer: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    borderRadius: radius.full,
    zIndex: 99,
  },
  toastText: {
    color: '#F8FAFC',
  },
});
