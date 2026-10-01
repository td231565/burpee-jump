import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { ChevronLeft, Pause, Play, Square } from 'lucide-react-native';
import { AppText } from '../components/ui/app-text';
import { Button } from '../components/ui/button';
import { IconButton } from '../components/ui/icon-button';
import { NatureBackdrop } from '../components/ui/nature-backdrop';
import { ConfirmDialog } from '../components/ui/confirm-dialog';
import { getAudioPreferences, type AudioPreferences } from '../data/audio-preferences';
import { insertCompletion } from '../data/completions';
import { useTabataTimer } from '../features/workout/use-tabata-timer';
import { TimerDisplay } from '../features/workout/components/timer-display';
import { WorkoutCompanion } from '../features/workout/components/workout-companion';
import { CelebrationDisplay } from '../features/workout/components/celebration-display';
import { triggerCompletionVibration } from '../features/workout/vibration';
import { colors, radius, spacing } from '../theme/tokens';

export default function WorkoutScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const isUnrecorded = mode === 'unrecorded';

  const [preferences, setPreferences] = useState<AudioPreferences>({
    voice_enabled: true,
    cues_enabled: true,
    music_enabled: true,
  });

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

  const timer = useTabataTimer({ preferences, recordCompletion: !isUnrecorded });

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

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <NatureBackdrop />
      <View style={styles.container}>
        {/* 頂部導航列 */}
        <View style={styles.header}>
          <IconButton
            onPress={handleBackPress}
            accessibilityLabel="返回首頁"
          >
            <ChevronLeft size={24} color={colors.ink} strokeWidth={2} />
          </IconButton>
          <AppText variant="title" style={styles.headerTitle}>
            Tabata 訓練
          </AppText>
          <View style={styles.headerPlaceholder} />
        </View>

        {/* 核心內容區 */}
        <View style={styles.content}>
          {timer.status === 'ready' && (
            <View style={styles.stateWrapper}>
              <View style={styles.companionSlot}>
                <WorkoutCompanion status="ready" reduceMotion={reduceMotion} />
              </View>
              <View style={styles.readyCard}>
                <AppText variant="headline" style={styles.readyTitle}>
                  固定流程
                </AppText>
                <View style={styles.ruleList}>
                  <View style={styles.ruleItem}>
                    <View style={[styles.dot, { backgroundColor: colors.work }]} />
                    <AppText variant="body" style={styles.ruleText}>
                      運動 20 秒
                    </AppText>
                  </View>
                  <View style={styles.ruleItem}>
                    <View style={[styles.dot, { backgroundColor: colors.rest }]} />
                    <AppText variant="body" style={styles.ruleText}>
                      休息 10 秒
                    </AppText>
                  </View>
                  <View style={styles.ruleItem}>
                    <View style={[styles.dot, { backgroundColor: colors.today }]} />
                    <AppText variant="body" style={styles.ruleText}>
                      4 組，最後一組後不休息
                    </AppText>
                  </View>
                </View>

                {timer.isAudioDegraded && (
                  <View style={styles.degradedBanner}>
                    <AppText variant="caption" style={styles.degradedText}>
                      音訊無法播放，本次將以靜音模式進行
                    </AppText>
                  </View>
                )}
              </View>
            </View>
          )}

          {(timer.status === 'preparing' ||
            timer.status === 'running' ||
            timer.status === 'paused') && (
            <View style={styles.stateWrapper}>
              <View style={styles.companionSlot}>
                <WorkoutCompanion
                  status={timer.status}
                  stageType={timer.snapshot.stageType}
                  reduceMotion={reduceMotion}
                />
              </View>
              <TimerDisplay status={timer.status} snapshot={timer.snapshot} />
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
                訓練完成！
              </AppText>
              <AppText variant="body" style={styles.completedMessage}>
                {isUnrecorded ? '本次訓練已完成' : '本日波比跳 Tabata 訓練已完成'}
              </AppText>
            </View>
          )}
        </View>

        {/* 底部操作區 */}
        <View style={styles.footer}>
          {timer.status === 'ready' && (
            <Button
              variant="primary"
              onPress={timer.start}
              accessibilityLabel="開始"
              style={styles.actionButton}
            >
              開始
            </Button>
          )}

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
                <Pause size={32} color={colors.success} fill={colors.success} />
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
  content: {
    flex: 1,
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
  readyTitle: {
    marginBottom: spacing.base,
    color: colors.ink,
    textAlign: 'center',
  },
  ruleList: {
    gap: spacing.md,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
  },
  ruleText: {
    fontSize: 16,
    color: colors.ink,
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
