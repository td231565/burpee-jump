import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { ChevronLeft, Minus, Pause, Play, Plus, Square } from 'lucide-react-native';
import { AppText } from '../components/ui/app-text';
import { Button } from '../components/ui/button';
import { IconButton } from '../components/ui/icon-button';
import { NatureBackdrop } from '../components/ui/nature-backdrop';
import { ConfirmDialog } from '../components/ui/confirm-dialog';
import { getAudioPreferences, type AudioPreferences } from '../data/audio-preferences';
import { getWorkoutPreferences, saveWorkoutPreferences } from '../data/workout-preferences';
import { insertCompletion } from '../data/completions';
import { DEFAULT_WORKOUT_PARAMETERS, type WorkoutParameters } from '../features/workout/tabata';
import { useTabataTimer } from '../features/workout/use-tabata-timer';
import { TimerDisplay } from '../features/workout/components/timer-display';
import { WorkoutCompanion } from '../features/workout/components/workout-companion';
import { CelebrationDisplay } from '../features/workout/components/celebration-display';
import { triggerCompletionVibration } from '../features/workout/vibration';
import { colors, radius, spacing } from '../theme/tokens';

export default function WorkoutScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const { height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [headerHeight, setHeaderHeight] = useState(44 + spacing.base + spacing.sm);
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const isUnrecorded = mode === 'unrecorded';

  const [preferences, setPreferences] = useState<AudioPreferences | null>(null);
  const [workoutParameters, setWorkoutParameters] = useState<WorkoutParameters>(
    DEFAULT_WORKOUT_PARAMETERS
  );
  const [workoutPreferencesLoaded, setWorkoutPreferencesLoaded] = useState(false);

  const [showConfirm, setShowConfirm] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let isMounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (isMounted) {
          setReduceMotion(enabled);
        }
      })
      .catch(() => {});

    const sub = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled) => {
        setReduceMotion(enabled);
      }
    );

    return () => {
      isMounted = false;
      sub?.remove?.();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    if (db) {
      getAudioPreferences(db)
        .then((prefs) => {
          if (isMounted) {
            setPreferences(prefs);
          }
        })
        .catch(() => {
          if (isMounted) {
            setPreferences({
              voice_enabled: false,
              cues_enabled: false,
              music_enabled: false,
            });
          }
        });
    }
    return () => {
      isMounted = false;
    };
  }, [db]);

  useEffect(() => {
    let isMounted = true;
    getWorkoutPreferences(db)
      .then((parameters) => {
        if (isMounted) {
          setWorkoutParameters(parameters);
          setWorkoutPreferencesLoaded(true);
        }
      })
      .catch(() => {
        if (isMounted) {
          setWorkoutParameters(DEFAULT_WORKOUT_PARAMETERS);
          setWorkoutPreferencesLoaded(true);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [db]);

  const timer = useTabataTimer({ preferences, recordCompletion: !isUnrecorded });

  const adjustWorkoutParameter = (
    key: keyof WorkoutParameters,
    delta: number,
    minimum: number,
    maximum: number
  ) => {
    setWorkoutParameters((current) => ({
      ...current,
      [key]: Math.min(maximum, Math.max(minimum, current[key] + delta)),
    }));
  };

  const handleStart = () => {
    const selectedParameters = { ...workoutParameters };
    void saveWorkoutPreferences(db, selectedParameters).catch(() => {});
    timer.start(selectedParameters);
  };

  // 自動保存
  const isSavingRef = useRef(false);
  const { status, saveRecord, markSaveSuccess, markSaveError } = timer;
  useEffect(() => {
    if (status === 'saving' && saveRecord && db && !isSavingRef.current) {
      isSavingRef.current = true;
      insertCompletion(db, saveRecord.localDate, saveRecord.completedAt)
        .then(() => {
          isSavingRef.current = false;
          markSaveSuccess();
        })
        .catch(() => {
          isSavingRef.current = false;
          markSaveError();
        });
    }
  }, [status, saveRecord, db, markSaveSuccess, markSaveError]);

  // 完成回饋一次性震動
  const hasVibratedRef = useRef(false);
  useEffect(() => {
    if (status === 'completed' && !hasVibratedRef.current) {
      hasVibratedRef.current = true;
      triggerCompletionVibration();
    }
  }, [status]);

  const handleBackPress = () => {
    if (timer.status === 'ready' || timer.status === 'preparing') {
      timer.cancel();
      router.back();
    } else if (timer.status === 'running' || timer.status === 'paused') {
      setShowConfirm(true);
    } else if (timer.status === 'saveError') {
      setShowDiscardConfirm(true);
    } else if (timer.status === 'completed') {
      if (isUnrecorded) {
        router.back();
      } else {
        router.dismissTo({
          pathname: '/',
          params: { completedLocalDate: timer.lockedLocalDate ?? '' },
        });
      }
    }
  };

  const handleConfirmCancel = () => {
    setShowConfirm(false);
    timer.cancel();
    router.back();
  };

  const handleConfirmDiscard = () => {
    setShowDiscardConfirm(false);
    timer.discardSave();
    router.back();
  };

  const isTraining = timer.status === 'preparing' || timer.status === 'running' || timer.status === 'paused';
  const hasFixedCompanion = timer.status === 'ready' || isTraining;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <NatureBackdrop />
      <View style={styles.container}>
        {/* 頂部導航列 */}
        <View
          style={styles.header}
          onLayout={({ nativeEvent }) => setHeaderHeight(nativeEvent.layout.height)}
        >
          <IconButton
            onPress={handleBackPress}
            accessibilityLabel="返回首頁"
          >
            <ChevronLeft size={24} color={colors.ink} strokeWidth={2} />
          </IconButton>
          <AppText variant="title" style={styles.headerTitle}>
            訓練
          </AppText>
          <View style={styles.headerPlaceholder} />
        </View>

        {/* 核心內容區 */}
        <View style={styles.workoutBody}>
          {hasFixedCompanion && (
            <View style={[
              styles.fixedCompanionSlot,
              { paddingTop: Math.max(0, screenHeight / 3 - insets.top - headerHeight - spacing.sm) },
            ]}>
              <WorkoutCompanion
                status={timer.status}
                stageType={timer.snapshot.stageType}
                reduceMotion={reduceMotion}
              />
            </View>
          )}
          <ScrollView
            style={styles.contentScroll}
            contentContainerStyle={[styles.content, hasFixedCompanion && styles.anchoredContent]}
            contentInsetAdjustmentBehavior="automatic"
          >
            {timer.status === 'ready' && (
              <View style={styles.stateWrapper}>
                <View style={styles.readyCard}>
                  <View style={styles.settingList}>
                    <WorkoutStepper
                      label="運動"
                      tone="green"
                      value={workoutParameters.workSeconds}
                      unit="秒"
                      decreaseLabel="減少運動秒數"
                      increaseLabel="增加運動秒數"
                      decreaseDisabled={!workoutPreferencesLoaded || workoutParameters.workSeconds <= 10}
                      increaseDisabled={!workoutPreferencesLoaded || workoutParameters.workSeconds >= 60}
                      onDecrease={() => adjustWorkoutParameter('workSeconds', -2, 10, 60)}
                      onIncrease={() => adjustWorkoutParameter('workSeconds', 2, 10, 60)}
                    />
                    <WorkoutStepper
                      label="休息"
                      tone="yellow"
                      value={workoutParameters.restSeconds}
                      unit="秒"
                      decreaseLabel="減少休息秒數"
                      increaseLabel="增加休息秒數"
                      decreaseDisabled={!workoutPreferencesLoaded || workoutParameters.restSeconds <= 6}
                      increaseDisabled={!workoutPreferencesLoaded || workoutParameters.restSeconds >= 30}
                      onDecrease={() => adjustWorkoutParameter('restSeconds', -2, 6, 30)}
                      onIncrease={() => adjustWorkoutParameter('restSeconds', 2, 6, 30)}
                    />
                    <WorkoutStepper
                      label="組數"
                      tone="red"
                      value={workoutParameters.rounds}
                      unit="組"
                      decreaseLabel="減少組數"
                      increaseLabel="增加組數"
                      decreaseDisabled={!workoutPreferencesLoaded || workoutParameters.rounds <= 1}
                      increaseDisabled={!workoutPreferencesLoaded || workoutParameters.rounds >= 10}
                      onDecrease={() => adjustWorkoutParameter('rounds', -1, 1, 10)}
                      onIncrease={() => adjustWorkoutParameter('rounds', 1, 1, 10)}
                    />
                  </View>

                  {timer.isAudioDegraded && (
                    <View style={styles.degradedBanner}>
                      <AppText variant="caption" style={styles.degradedText}>
                        音訊無法播放，本次將以靜音模式進行
                      </AppText>
                    </View>
                  )}
                </View>
                <Button
                  variant="primary"
                  onPress={handleStart}
                  disabled={!workoutPreferencesLoaded}
                  accessibilityLabel="開始"
                  style={[styles.actionButton, styles.readyStartButton]}
                >
                  開始
                </Button>
              </View>
            )}

            {isTraining && (
              <View style={styles.stateWrapper}>
                <TimerDisplay status={timer.status} snapshot={timer.snapshot} />
                <View style={styles.trainingControls}>
                  {timer.status === 'preparing' && (
                    <View style={styles.iconButtonRow}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="取消訓練"
                        onPress={handleBackPress}
                        style={({ pressed }) => [
                          styles.iconActionButton,
                          pressed && styles.iconButtonPressed,
                        ]}
                        hitSlop={12}
                      >
                        <Square size={32} color={colors.error} fill={colors.error} />
                      </Pressable>
                    </View>
                  )}

                  {timer.status === 'running' && (
                    <View style={styles.iconButtonRow}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="暫停"
                        onPress={timer.pause}
                        style={({ pressed }) => [
                          styles.iconActionButton,
                          pressed && styles.iconButtonPressed,
                        ]}
                        hitSlop={12}
                      >
                        <Pause size={32} color={colors.workoutPause} fill={colors.workoutPause} />
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="取消訓練"
                        onPress={handleBackPress}
                        style={({ pressed }) => [
                          styles.iconActionButton,
                          pressed && styles.iconButtonPressed,
                        ]}
                        hitSlop={12}
                      >
                        <Square size={32} color={colors.error} fill={colors.error} />
                      </Pressable>
                    </View>
                  )}

                  {timer.status === 'paused' && (
                    <View style={styles.iconButtonRow}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="繼續"
                        onPress={timer.resume}
                        style={({ pressed }) => [
                          styles.iconActionButton,
                          pressed && styles.iconButtonPressed,
                        ]}
                        hitSlop={12}
                      >
                        <Play size={32} color={colors.success} fill={colors.success} />
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="取消訓練"
                        onPress={handleBackPress}
                        style={({ pressed }) => [
                          styles.iconActionButton,
                          pressed && styles.iconButtonPressed,
                        ]}
                        hitSlop={12}
                      >
                        <Square size={32} color={colors.error} fill={colors.error} />
                      </Pressable>
                    </View>
                  )}
                </View>
              </View>
            )}

            {timer.status === 'saving' && (
              <View style={styles.stateWrapper}>
                <View style={styles.companionSlot}>
                  <WorkoutCompanion status="saving" reduceMotion={reduceMotion} />
                </View>
                <View style={styles.savingCard}>
                  <AppText variant="headline" style={styles.savingTitle}>
                    正在保存紀錄...
                  </AppText>
                </View>
              </View>
            )}

            {timer.status === 'saveError' && (
              <View style={styles.stateWrapper}>
                <View style={styles.companionSlot}>
                  <WorkoutCompanion status="saveError" reduceMotion={reduceMotion} />
                </View>
                <View style={styles.errorCard}>
                  <AppText variant="headline" style={styles.errorTitle}>
                    儲存失敗
                  </AppText>
                  <AppText variant="body" style={styles.errorMessage}>
                    無法寫入訓練紀錄，請重新儲存或放棄本次紀錄
                  </AppText>
                </View>
              </View>
            )}

            {timer.status === 'completed' && (
              <View style={styles.completedCard}>
                <CelebrationDisplay reduceMotion={reduceMotion} />
                <AppText variant="hero" style={styles.completedTitle}>
                  訓練完成
                </AppText>
                {!isUnrecorded && (
                  <AppText variant="body" style={styles.completedMessage}>
                    本日波比跳訓練已完成
                  </AppText>
                )}
              </View>
            )}
          </ScrollView>
        </View>

        {/* 底部操作區 */}
        {!hasFixedCompanion && (
          <View style={styles.footer}>
            {timer.status === 'saveError' && (
              <View style={styles.buttonRow}>
                <Button
                  variant="primary"
                  onPress={timer.retrySave}
                  accessibilityLabel="重新儲存"
                  style={styles.halfButton}
                >
                  重新儲存
                </Button>
                <Button
                  variant="secondary"
                  onPress={() => setShowDiscardConfirm(true)}
                  accessibilityLabel="放棄紀錄"
                  style={styles.halfButton}
                >
                  放棄紀錄
                </Button>
              </View>
            )}

            {timer.status === 'completed' && (
              <Button
                variant="primary"
                onPress={handleBackPress}
                accessibilityLabel="返回首頁"
                style={styles.actionButton}
              >
                返回首頁
              </Button>
            )}
          </View>
        )}

        {/* 取消確認對話框 */}
        <ConfirmDialog
          visible={showConfirm}
          title="確定要取消訓練嗎？"
          message="本次訓練將不會被記錄"
          confirmText="放棄並離開"
          cancelText="繼續訓練"
          onConfirm={handleConfirmCancel}
          onCancel={() => setShowConfirm(false)}
        />

        {/* 放棄紀錄確認對話框 */}
        <ConfirmDialog
          visible={showDiscardConfirm}
          title="確定要放棄紀錄嗎？"
          message="離開後本次完成不會被記錄"
          confirmText="放棄並離開"
          cancelText="繼續儲存"
          onConfirm={handleConfirmDiscard}
          onCancel={() => setShowDiscardConfirm(false)}
        />
      </View>
    </SafeAreaView>
  );
}

interface WorkoutStepperProps {
  label: string;
  tone: 'green' | 'yellow' | 'red';
  value: number;
  unit: string;
  decreaseLabel: string;
  increaseLabel: string;
  decreaseDisabled: boolean;
  increaseDisabled: boolean;
  onDecrease: () => void;
  onIncrease: () => void;
}

function WorkoutStepper({
  label,
  tone,
  value,
  unit,
  decreaseLabel,
  increaseLabel,
  decreaseDisabled,
  increaseDisabled,
  onDecrease,
  onIncrease,
}: WorkoutStepperProps) {
  const iconColor = { green: colors.success, yellow: colors.today, red: colors.work }[tone];
  return (
    <View style={styles.settingRow}>
      <AppText variant="body" style={styles.settingLabel}>
        {label}
      </AppText>
      <View style={styles.stepper}>
        <IconButton
          variant="jelly"
          tone={tone}
          onPress={onDecrease}
          accessibilityLabel={decreaseLabel}
          disabled={decreaseDisabled}
        >
          <Minus size={20} color={decreaseDisabled ? colors.muted : iconColor} />
        </IconButton>
        <View style={styles.stepperValue}>
          <AppText variant="headline" style={styles.valueText}>{value}</AppText>
          <AppText variant="caption" style={styles.unitText}>{unit}</AppText>
        </View>
        <IconButton
          variant="jelly"
          tone={tone}
          onPress={onIncrease}
          accessibilityLabel={increaseLabel}
          disabled={increaseDisabled}
        >
          <Plus size={20} color={increaseDisabled ? colors.muted : iconColor} />
        </IconButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  container: {
    flex: 1,
    zIndex: 1,
    paddingHorizontal: spacing.base,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.base,
    paddingBottom: spacing.sm,
  },
  headerTitle: {
    color: colors.ink,
  },
  headerPlaceholder: {
    width: 44,
  },
  workoutBody: {
    flex: 1,
  },
  fixedCompanionSlot: {
    flexShrink: 0,
    alignItems: 'center',
    paddingBottom: spacing.base,
  },
  anchoredContent: {
    justifyContent: 'flex-start',
    paddingTop: 0,
  },
  readyStartButton: {
    marginTop: spacing.lg,
  },
  contentScroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
  },
  stateWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  companionSlot: {
    marginBottom: spacing.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readyCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  settingList: {
    gap: spacing.base,
  },
  settingRow: {
    minHeight: 44,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  settingLabel: {
    flexShrink: 1,
    color: colors.ink,
  },
  stepper: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  stepperValue: {
    minWidth: 42,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 2,
  },
  valueText: {
    color: colors.ink,
  },
  unitText: {
    color: colors.muted,
  },
  degradedBanner: {
    marginTop: spacing.base,
    padding: spacing.sm,
    backgroundColor: colors.errorLight,
    borderRadius: radius.sm,
  },
  degradedText: {
    color: colors.error,
    textAlign: 'center',
  },
  savingCard: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  savingTitle: {
    color: colors.ink,
    textAlign: 'center',
  },
  errorCard: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  errorTitle: {
    color: colors.error,
    marginBottom: spacing.base,
    textAlign: 'center',
  },
  errorMessage: {
    color: colors.muted,
    textAlign: 'center',
  },
  completedCard: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  completedTitle: {
    color: colors.success,
    marginBottom: spacing.base,
  },
  completedMessage: {
    color: colors.muted,
    textAlign: 'center',
  },
  footer: {
    paddingVertical: spacing.base,
    paddingBottom: spacing.lg,
    alignItems: 'center',
  },
  actionButton: {
    minHeight: 48,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    width: '100%',
  },
  halfButton: {
    minHeight: 48,
  },
  trainingControls: {
    marginTop: spacing.lg,
    width: '100%',
  },
  iconButtonRow: {
    flexDirection: 'row',
    gap: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  iconActionButton: {
    minWidth: 48,
    minHeight: 48,
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonPressed: {
    opacity: 0.6,
    transform: [{ scale: 0.92 }],
  },
});
