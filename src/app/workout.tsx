import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { AppText } from '../components/ui/app-text';
import { Button } from '../components/ui/button';
import { IconButton } from '../components/ui/icon-button';
import { ConfirmDialog } from '../components/ui/confirm-dialog';
import { getAudioPreferences, type AudioPreferences } from '../data/audio-preferences';
import { useTabataTimer } from '../features/workout/use-tabata-timer';
import { TimerDisplay } from '../features/workout/components/timer-display';
import { colors, radius, spacing } from '../theme/tokens';

export default function WorkoutScreen() {
  const router = useRouter();
  const db = useSQLiteContext();

  const [preferences, setPreferences] = useState<AudioPreferences>({
    voice_enabled: true,
    cues_enabled: true,
    music_enabled: true,
  });

  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (db) {
      getAudioPreferences(db).then((prefs) => {
        if (isMounted) {
          setPreferences(prefs);
        }
      }).catch(() => {});
    }
    return () => {
      isMounted = false;
    };
  }, [db]);

  const timer = useTabataTimer({ preferences });

  const handleBackPress = () => {
    if (timer.status === 'ready' || timer.status === 'preparing') {
      timer.cancel();
      router.back();
    } else if (timer.status === 'running' || timer.status === 'paused') {
      setShowConfirm(true);
    } else {
      router.back();
    }
  };

  const handleConfirmCancel = () => {
    setShowConfirm(false);
    timer.cancel();
    router.back();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        {/* 頂部導航列 */}
        <View style={styles.header}>
          <IconButton
            onPress={handleBackPress}
            accessibilityLabel="返回日曆"
          >
            ‹
          </IconButton>
          <AppText variant="title" style={styles.headerTitle}>
            Tabata 訓練
          </AppText>
          <View style={styles.headerPlaceholder} />
        </View>

        {/* 核心內容區 */}
        <View style={styles.content}>
          {timer.status === 'ready' && (
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
          )}

          {(timer.status === 'preparing' ||
            timer.status === 'running' ||
            timer.status === 'paused') && (
            <TimerDisplay status={timer.status} snapshot={timer.snapshot} />
          )}

          {timer.status === 'completed' && (
            <View style={styles.completedCard}>
              <AppText variant="hero" style={styles.completedTitle}>
                訓練完成！
              </AppText>
              <AppText variant="body" style={styles.completedMessage}>
                本日波比跳 Tabata 訓練已完成
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
            <Button
              variant="secondary"
              onPress={handleBackPress}
              accessibilityLabel="取消訓練"
              style={styles.actionButton}
            >
              取消訓練
            </Button>
          )}

          {timer.status === 'running' && (
            <View style={styles.buttonRow}>
              <Button
                variant="secondary"
                onPress={timer.pause}
                accessibilityLabel="暫停"
                style={styles.halfButton}
              >
                暫停
              </Button>
              <Button
                variant="secondary"
                onPress={handleBackPress}
                accessibilityLabel="取消訓練"
                style={styles.halfButton}
              >
                取消訓練
              </Button>
            </View>
          )}

          {timer.status === 'paused' && (
            <View style={styles.buttonRow}>
              <Button
                variant="primary"
                onPress={timer.resume}
                accessibilityLabel="繼續"
                style={styles.halfButton}
              >
                繼續
              </Button>
              <Button
                variant="secondary"
                onPress={handleBackPress}
                accessibilityLabel="取消訓練"
                style={styles.halfButton}
              >
                取消訓練
              </Button>
            </View>
          )}

          {timer.status === 'completed' && (
            <Button
              variant="primary"
              onPress={() => router.back()}
              accessibilityLabel="返回日曆"
              style={styles.actionButton}
            >
              返回日曆
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
  },
  actionButton: {
    width: '100%',
    minHeight: 48,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
  halfButton: {
    flex: 1,
    minHeight: 48,
  },
});
