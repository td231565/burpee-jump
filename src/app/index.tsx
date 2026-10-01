import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  AppState,
  type AppStateStatus,
  BackHandler,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { BookOpen, Calendar, ChevronLeft, ChevronRight, Home, RotateCw, Settings } from 'lucide-react-native';
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
import { PixelCharacter } from '../features/workout/components/pixel-character';
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

export type HomeTab = 'home' | 'calendar';
export type TodayStatus = 'loading' | 'pending' | 'completed' | 'rest' | 'unavailable';
export type ChallengeStatus = 'loading' | 'none' | 'active' | 'unavailable';
export type StreakStatus = 'loading' | 'ready' | 'unavailable';

// 記憶體中單次執行提示旗標（不入庫）
let hasShownSettlementToastInSession = false;

export default function HomeScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const params = useLocalSearchParams<{ completedLocalDate?: string }>();
  const { width, height: windowHeight, fontScale } = useWindowDimensions();

  // Phase 3: 今日已完成裝飾肌肉小人尺寸（一般 88×98、小螢幕／大字級縮小至 64×72、特小螢幕／極大字級隱藏以確保操作區不捲動）
  const showCelebrateCharacter = !(windowHeight < 560 || fontScale >= 1.8);
  const celebrateDimensions =
    windowHeight < 680 || fontScale > 1.3
      ? { width: 64, height: 72 }
      : { width: 88, height: 98 };

  const [appState, setAppState] = useState<'loading' | 'onboarding' | 'home'>('loading');
  const [nickname, setNickname] = useState<string | null>(null);

  // 語意導覽分頁狀態
  const [activeTab, setActiveTab] = useState<HomeTab>('home');

  const [todayDate, setTodayDate] = useState(() => new Date());
  const currentKeyRef = useRef(formatLocalDateKey(todayDate));

  // 今日狀態：loading | pending | completed | rest | unavailable
  const [todayStatus, setTodayStatus] = useState<TodayStatus>('loading');
  const todayTrustedStateRef = useRef<
    Record<string, 'pending' | 'completed' | 'rest'>
  >({});

  // 月曆紀錄狀態：loading | ready | unavailable
  const [monthStatus, setMonthStatus] = useState<'loading' | 'ready' | 'unavailable'>('loading');
  const [completionsMap, setCompletionsMap] = useState<Record<string, boolean>>({});
  const [restDaysMap, setRestDaysMap] = useState<Record<string, boolean>>({});
  const monthTrustedDataRef = useRef<Record<string, boolean>>({});

  // 挑戰與連續天數獨立狀態
  const [challengeStatus, setChallengeStatus] = useState<ChallengeStatus>('loading');
  const [challengeSummary, setChallengeSummary] = useState<ChallengeSummary | null>(null);
  const challengeSummaryRef = useRef<ChallengeSummary | null>(null);
  useEffect(() => {
    challengeSummaryRef.current = challengeSummary;
  }, [challengeSummary]);

  const [streakStatus, setStreakStatus] = useState<StreakStatus>('loading');
  const [streak, setStreak] = useState<number>(0);
  const recentRecordsRef = useRef<{ compSet: Set<string>; restSet: Set<string> } | null>(null);

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

  // GO 動畫與 Reduce Motion 狀態
  const [scaleAnim] = useState(() => new Animated.Value(1));
  const isLoopRunningRef = useRef(false);
  const loopAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let isMounted = true;
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((enabled) => {
        if (isMounted) setReduceMotion(enabled);
      })
      .catch(() => {});

    const listener = AccessibilityInfo.addEventListener?.(
      'reduceMotionChanged',
      (enabled) => {
        if (isMounted) setReduceMotion(enabled);
      }
    );

    return () => {
      isMounted = false;
      listener?.remove?.();
    };
  }, []);

  const startBreathing = useCallback(() => {
    if (isLoopRunningRef.current) return;
    isLoopRunningRef.current = true;
    loopAnimationRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.025,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loopAnimationRef.current.start();
  }, [scaleAnim]);

  const stopBreathing = useCallback(() => {
    if (loopAnimationRef.current) {
      loopAnimationRef.current.stop();
      loopAnimationRef.current = null;
    }
    isLoopRunningRef.current = false;
    scaleAnim.setValue(1);
  }, [scaleAnim]);

  const isGoVisible =
    activeTab === 'home' &&
    (todayStatus === 'pending' || todayStatus === 'rest');

  useEffect(() => {
    if (isGoVisible && !reduceMotion) {
      startBreathing();
    } else {
      stopBreathing();
    }
    return () => {
      stopBreathing();
    };
  }, [isGoVisible, reduceMotion, startBreathing, stopBreathing]);

  // Android 系統返回鍵處理：日曆 tab 先切回首頁並宣告，已在首頁時交給系統預設
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (activeTab === 'calendar') {
        setActiveTab('home');
        AccessibilityInfo.announceForAccessibility?.('首頁');
        return true;
      }
      return false;
    });

    return () => subscription.remove();
  }, [activeTab]);

  const isCurrentMonthView =
    viewYear === todayDate.getFullYear() && viewMonth === todayDate.getMonth() + 1;

  const currentMonthText = formatYearMonth(new Date(viewYear, viewMonth - 1, 1));

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  }, []);

  // 評估溫和復歸與補登日期
  const evaluateGentleRecovery = useCallback(
    (
      summary: ChallengeSummary | null,
      currentKey: string,
      records: { compSet: Set<string>; restSet: Set<string> } | null
    ) => {
      if (!summary || summary.isEnded || !records) {
        setIsGentleRecovery(false);
        setPendingActionDate(null);
        return;
      }
      const yesterdayKey = getYesterday(currentKey);
      const yesterdayHasRecord =
        records.compSet.has(yesterdayKey) || records.restSet.has(yesterdayKey);
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
    },
    []
  );

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

  // 獨立查詢挑戰資料
  const fetchChallengeData = useCallback(
    async (database: any, currentKey: string) => {
      setChallengeStatus('loading');
      try {
        const active = await getActiveChallenge(database, currentKey);
        if (active) {
          const summary = await getChallengeSummary(database, active, currentKey);
          setChallengeSummary(summary);
          setChallengeStatus(summary && !summary.isEnded ? 'active' : 'none');
          evaluateGentleRecovery(summary, currentKey, recentRecordsRef.current);
        } else {
          setChallengeSummary(null);
          setChallengeStatus('none');
          evaluateGentleRecovery(null, currentKey, recentRecordsRef.current);
        }
      } catch {
        setChallengeStatus('unavailable');
      }
    },
    [evaluateGentleRecovery]
  );

  // 獨立查詢連續訓練天數
  const fetchStreakData = useCallback(
    async (database: any, currentKey: string, isCompleted: boolean) => {
      setStreakStatus('loading');
      try {
        const rangeStart = addDays(currentKey, -365);
        const [comps, rests] = await Promise.all([
          getCompletionsForMonth(database, rangeStart, currentKey),
          getRestDaysForRange(database, rangeStart, currentKey),
        ]);
        const compSet = new Set(comps.map((c) => c.local_date));
        const restSet = new Set(rests.map((r) => r.local_date));
        const records = { compSet, restSet };
        recentRecordsRef.current = records;

        const streakVal = calculateStreak({
          completedDates: compSet,
          restDates: restSet,
          todayKey: currentKey,
          isTodayCompleted: isCompleted,
        });
        setStreak(streakVal);
        setStreakStatus('ready');
        evaluateGentleRecovery(challengeSummaryRef.current, currentKey, records);
      } catch {
        setStreakStatus('unavailable');
      }
    },
    [evaluateGentleRecovery]
  );

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

  // 結算檢查（僅在非操作中觸發）
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
          fetchChallengeData(db, currentKey);
          fetchStreakData(db, currentKey, true);
        });
        fetchMonthCompletions(db, targetYear, targetMonth);
        fetchAudioPreferences(db);
        checkSettlement(db, currentKey);
      } else {
        fetchTodayStatus(db, currentKey).then(() => {
          fetchChallengeData(db, currentKey);
          fetchStreakData(
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
      fetchChallengeData,
      fetchStreakData,
      fetchMonthCompletions,
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
            fetchChallengeData(db, nowKey);
            fetchStreakData(
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
    fetchChallengeData,
    fetchStreakData,
    fetchMonthCompletions,
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

  const handleReloadStreak = () => {
    if (!db) return;
    const currentKey = formatLocalDateKey(todayDate);
    const isCompleted = todayTrustedStateRef.current[currentKey] === 'completed';
    fetchStreakData(db, currentKey, isCompleted);
  };

  const handleReloadChallenge = () => {
    if (!db) return;
    const currentKey = formatLocalDateKey(todayDate);
    fetchChallengeData(db, currentKey);
  };

  const handleTabChange = (tab: HomeTab) => {
    if (activeTab === tab) {
      // 再次點擊已選取 tab 為 no-op
      return;
    }
    setActiveTab(tab);
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
    await fetchChallengeData(db, currentKey);
    await fetchStreakData(db, currentKey, false);
    await fetchMonthCompletions(db, viewYearRef.current, viewMonthRef.current);
  };

  // 當日取消休息
  const handleCancelTodayRest = async () => {
    if (!db) return;
    const currentKey = formatLocalDateKey(todayDate);
    await cancelRestDay(db, currentKey);
    await fetchTodayStatus(db, currentKey, true);
    await fetchChallengeData(db, currentKey);
    await fetchStreakData(db, currentKey, false);
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
    fetchChallengeData(db, currentKey);
    fetchStreakData(db, currentKey, false);
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

  const goFontSize = Math.min(120, Math.max(88, width * 0.28));

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <NatureBackdrop />
      <View style={styles.mainContainer}>
        {/* 首頁分頁內容 */}
        <View
          style={[styles.tabViewWrapper, activeTab !== 'home' && styles.hiddenTab]}
          accessibilityElementsHidden={activeTab !== 'home'}
          importantForAccessibility={activeTab === 'home' ? 'auto' : 'no-hide-descendants'}
        >
          <ScrollView
            style={styles.tabScrollView}
            contentContainerStyle={styles.homeScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* 首頁頂部列：動作教學與設定按鈕 */}
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
                  {`Hi ${nickname.trim()}`}
                </AppText>
              </View>
            ) : null}

            {/* 首頁中間核心區：無白框卡片，直接位於 NatureBackdrop 上 */}
            <View style={styles.homeCenter}>
              <View style={styles.homeCoreContent}>
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
                  <View style={styles.completedStatusContainer}>
                    <AppText variant="hero" style={styles.completedStatusText}>
                      今日已完成
                    </AppText>
                    {showCelebrateCharacter && (
                      <View
                        style={styles.celebrateWrapper}
                        accessible={false}
                        importantForAccessibility="no-hide-descendants"
                      >
                        <PixelCharacter
                          frame="celebrate"
                          width={celebrateDimensions.width}
                          height={celebrateDimensions.height}
                        />
                      </View>
                    )}
                  </View>
                )}

                {todayStatus === 'unavailable' && (
                  <View style={styles.statusRow}>
                    <AppText variant="title" style={styles.errorStatusText}>
                      暫時無法讀取今日紀錄
                    </AppText>
                  </View>
                )}

                {/* 待完成或休息日顯示引導語與大型純文字 GO */}
                {(todayStatus === 'pending' || todayStatus === 'rest') && (
                  <>
                    <AppText variant="body" style={styles.guidanceText}>
                      準備開始今天的訓練了嗎
                    </AppText>

                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="GO，開始今天的 2 分鐘"
                      onPress={() => router.push('/workout')}
                      style={[
                        styles.goPressable,
                        { minWidth: Math.min(width * 0.5, 200) },
                      ]}
                    >
                      <Animated.Text
                        style={[
                          styles.goText,
                          {
                            fontSize: goFontSize,
                            transform: [{ scale: scaleAnim }],
                          },
                        ]}
                      >
                        GO
                      </Animated.Text>
                    </Pressable>
                  </>
                )}
              </View>
            </View>

            {/* 首頁底部次要操作區 */}
            <View style={styles.homeFooter}>
              {/* 溫和復歸提示 */}
              {isGentleRecovery && todayStatus === 'pending' && (
                <AppText variant="body" style={styles.recoveryText}>
                  今天重新開始
                </AppText>
              )}

              {todayStatus === 'pending' && challengeStatus === 'active' && challengeSummary && (
                <View style={styles.footerActionGroup}>
                  {challengeSummary.remainingRestQuota > 0 ? (
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
                  )}
                </View>
              )}

              {todayStatus === 'rest' && (
                <View style={styles.footerActionGroup}>
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
                    variant="secondary"
                    onPress={() =>
                      router.push({
                        pathname: '/workout',
                        params: { mode: 'unrecorded' },
                      })
                    }
                    accessibilityLabel="再做一次"
                    style={styles.actionButton}
                    iconRight={<RotateCw size={18} color={colors.ink} strokeWidth={2.2} />}
                  >
                    再做一次
                  </Button>
                </View>
              )}

              {todayStatus === 'unavailable' && (
                <View style={styles.unavailableBlock}>
                  <Button
                    variant="primary"
                    onPress={() => {
                      if (db) fetchTodayStatus(db, formatLocalDateKey(todayDate), true);
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
          </ScrollView>
        </View>

        {/* 日曆分頁內容 */}
        <View
          style={[styles.tabViewWrapper, activeTab !== 'calendar' && styles.hiddenTab]}
          accessibilityElementsHidden={activeTab !== 'calendar'}
          importantForAccessibility={activeTab === 'calendar' ? 'auto' : 'no-hide-descendants'}
        >
          <ScrollView
            style={styles.tabScrollView}
            contentContainerStyle={styles.calendarScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* 42/35/28 格月曆卡片，卡片頂部包含月份、streak、挑戰摘要與回到今天 */}
            <View style={styles.calendarCardWrapper}>
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
                    challengeStartDate={challengeStatus === 'active' && challengeSummary ? challengeSummary.startDate : null}
                    challengeEndDate={challengeStatus === 'active' && challengeSummary ? challengeSummary.endDate : null}
                    pendingActionDate={pendingActionDate}
                    onSelectDate={handleSelectDate}
                    errorContent={
                      monthStatus === 'unavailable' ? (
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
                      ) : undefined
                    }
                    header={
                        <View style={styles.calendarCardHeader}>
                          {/* 1. 月份導覽 */}
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

                          {/* 2. 連續訓練天數 */}
                          <View style={styles.calendarStreakRow}>
                            {streakStatus === 'loading' && (
                              <ActivityIndicator
                                size="small"
                                color={colors.primary}
                                accessibilityLabel="載入連續訓練天數"
                              />
                            )}
                            {streakStatus === 'ready' && (
                              <AppText variant="body" weight="bold" style={styles.calendarStreakText}>
                                {`已連續訓練 ${streak} 天`}
                              </AppText>
                            )}
                            {streakStatus === 'unavailable' && (
                              <Pressable
                                accessibilityRole="button"
                                accessibilityLabel="重新載入連續天數"
                                onPress={handleReloadStreak}
                                style={styles.retryRow}
                              >
                                <AppText variant="caption" style={styles.retryRowText}>
                                  暫時無法讀取連續天數
                                </AppText>
                                <RotateCw size={14} color={colors.muted} />
                              </Pressable>
                            )}
                          </View>

                          {/* 3. 進行中挑戰摘要或挑戰錯誤重試 */}
                          {challengeStatus === 'active' && challengeSummary && (
                            <View style={styles.calendarChallengeRow}>
                              <AppText variant="caption" weight="medium" style={styles.calendarChallengeInfoText}>
                                {`挑戰還有 ${challengeSummary.remainingDays} 天，可用休息 ${challengeSummary.remainingRestQuota} 天`}
                              </AppText>
                            </View>
                          )}
                          {challengeStatus === 'unavailable' && (
                            <View style={styles.calendarChallengeRow}>
                              <Pressable
                                accessibilityRole="button"
                                accessibilityLabel="重新載入挑戰資料"
                                onPress={handleReloadChallenge}
                                style={styles.retryRow}
                              >
                                <AppText variant="caption" style={styles.retryRowText}>
                                  暫時無法讀取挑戰資料
                                </AppText>
                                <RotateCw size={14} color={colors.muted} />
                              </Pressable>
                            </View>
                          )}

                          {/* 4. 回到今天（非當月檢視時顯示） */}
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
                      }
                    />
                  </View>
                </View>
            </View>
          </ScrollView>

          {/* Phase 3: 無進行中挑戰時，日曆頁固定底部、共用 nav 上方顯示設定挑戰週期按鈕 */}
          {challengeStatus === 'none' && (
            <View style={styles.calendarFixedFooter}>
              <Button
                variant="secondary"
                onPress={() => router.push('/challenge' as any)}
                accessibilityLabel="設定挑戰週期"
                style={styles.actionButton}
              >
                設定挑戰週期
              </Button>
            </View>
          )}
        </View>

        {/* 固定底部導覽列 */}
        <View
          accessibilityRole="tablist"
          accessible={true}
          style={styles.bottomNav}
        >
          <Pressable
            accessibilityRole="tab"
            accessibilityLabel="首頁"
            accessibilityState={{ selected: activeTab === 'home' }}
            onPress={() => handleTabChange('home')}
            style={styles.tabButton}
          >
            <Home
              size={22}
              color={activeTab === 'home' ? colors.primary : colors.muted}
              strokeWidth={activeTab === 'home' ? 2.5 : 2}
            />
            <AppText
              variant="caption"
              weight={activeTab === 'home' ? 'bold' : 'medium'}
              style={[
                styles.tabText,
                { color: activeTab === 'home' ? colors.primary : colors.muted },
              ]}
            >
              首頁
            </AppText>
          </Pressable>

          <Pressable
            accessibilityRole="tab"
            accessibilityLabel="日曆"
            accessibilityState={{ selected: activeTab === 'calendar' }}
            onPress={() => handleTabChange('calendar')}
            style={styles.tabButton}
          >
            <Calendar
              size={22}
              color={activeTab === 'calendar' ? colors.primary : colors.muted}
              strokeWidth={activeTab === 'calendar' ? 2.5 : 2}
            />
            <AppText
              variant="caption"
              weight={activeTab === 'calendar' ? 'bold' : 'medium'}
              style={[
                styles.tabText,
                { color: activeTab === 'calendar' ? colors.primary : colors.muted },
              ]}
            >
              日曆
            </AppText>
          </Pressable>
        </View>

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
  mainContainer: {
    flex: 1,
    position: 'relative',
  },
  tabViewWrapper: {
    flex: 1,
  },
  hiddenTab: {
    display: 'none',
  },
  tabScrollView: {
    flex: 1,
  },
  homeScrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.base,
  },
  calendarScrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.lg,
  },
  homeTopBar: {
    paddingTop: spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
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
  homeCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    minHeight: 240,
  },
  homeCoreContent: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayDateText: {
    color: colors.ink,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  statusRow: {
    minHeight: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  pendingStatusText: {
    color: colors.work,
    fontWeight: '600',
  },
  restStatusText: {
    color: colors.rest,
    fontWeight: '600',
  },
  completedStatusContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  celebrateWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  completedStatusText: {
    color: colors.today,
    fontWeight: '700',
    textAlign: 'center',
  },
  errorStatusText: {
    color: colors.rest,
    fontWeight: '600',
  },
  guidanceText: {
    color: colors.muted,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  goPressable: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    minHeight: 88,
  },
  goText: {
    color: colors.primary, // #2A87AD
    fontWeight: '700',
    textAlign: 'center',
    textShadowColor: 'rgba(42, 135, 173, 0.28)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  homeFooter: {
    paddingVertical: spacing.base,
    alignItems: 'center',
  },
  footerActionGroup: {
    gap: spacing.sm,
    alignItems: 'center',
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
    minHeight: 48,
  },
  unavailableBlock: {
    gap: spacing.sm,
    alignItems: 'center',
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
  calendarCardWrapper: {
    width: '100%',
  },
  calendarCardHeader: {
    paddingBottom: spacing.xs,
  },
  calendarNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.xs,
  },
  calendarHeaderTitle: {
    color: colors.ink,
  },
  calendarStreakRow: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 28,
    marginVertical: 2,
  },
  calendarStreakText: {
    color: colors.success,
  },
  calendarChallengeRow: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 24,
    marginVertical: 2,
  },
  calendarChallengeInfoText: {
    color: colors.muted,
    textAlign: 'center',
  },
  retryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: 44,
    paddingHorizontal: spacing.sm,
  },
  retryRowText: {
    color: colors.muted,
  },
  calendarTodayActionRow: {
    alignItems: 'center',
    marginVertical: spacing.xs,
  },
  todayButton: {
    minHeight: 40,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.base,
  },
  monthCalendarWrapper: {
    position: 'relative',
  },
  monthErrorCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
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
  calendarFixedFooter: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    alignItems: 'center',
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
    minHeight: 52,
    borderTopWidth: 0,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: spacing.xs,
  },
  tabButton: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    marginTop: 2,
  },
  toastContainer: {
    position: 'absolute',
    bottom: 64,
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
