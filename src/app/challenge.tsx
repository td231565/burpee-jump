import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { ChevronLeft } from 'lucide-react-native';
import { AppText } from '../components/ui/app-text';
import { Button } from '../components/ui/button';
import { IconButton } from '../components/ui/icon-button';
import { NatureBackdrop } from '../components/ui/nature-backdrop';
import { colors, radius, spacing } from '../theme/tokens';
import {
  addDays,
  formatDetailDate,
  formatLocalDateKey,
} from '../features/calendar/date-utils';
import {
  createChallenge,
  getDurationQuota,
} from '../data/challenges';
import type { ChallengeDuration } from '../data/challenge-types';

const DURATIONS: ChallengeDuration[] = [7, 14, 30];

export default function ChallengeScreen() {
  const router = useRouter();
  const db = useSQLiteContext();

  const [selectedDuration, setSelectedDuration] = useState<ChallengeDuration>(7);
  const [previewStartDate, setPreviewStartDate] = useState(() =>
    formatLocalDateKey(new Date())
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const previewEndDate = addDays(previewStartDate, selectedDuration - 1);
  const quota = getDurationQuota(selectedDuration);

  const handleStartChallenge = async () => {
    if (!db || isSubmitting) return;

    // 跨午夜或時區變動防呆：若點擊時當地日與預覽不符，僅刷新預覽，不建立
    const currentKey = formatLocalDateKey(new Date());
    if (currentKey !== previewStartDate) {
      setPreviewStartDate(currentKey);
      return;
    }

    try {
      setIsSubmitting(true);
      await createChallenge(db, currentKey, selectedDuration);
      router.back();
    } catch {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <NatureBackdrop />
      <View style={styles.container}>
        {/* 頂部導航 */}
        <View style={styles.header}>
          <IconButton
            onPress={() => router.back()}
            accessibilityLabel="返回首頁"
          >
            <ChevronLeft size={24} color={colors.ink} strokeWidth={2} />
          </IconButton>
          <AppText variant="title" style={styles.headerTitle}>
            開始挑戰
          </AppText>
          <View style={styles.headerPlaceholder} />
        </View>

        {/* 核心選擇區 */}
        <View style={styles.content}>
          <AppText variant="headline" style={styles.sectionTitle}>
            選擇挑戰週期
          </AppText>

          <View style={styles.optionsContainer}>
            {DURATIONS.map((duration) => {
              const isSelected = selectedDuration === duration;
              const itemQuota = getDurationQuota(duration);
              return (
                <Pressable
                  key={duration}
                  accessibilityRole="button"
                  accessibilityLabel={`${duration} 天挑戰，休息額度 ${itemQuota} 次`}
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => setSelectedDuration(duration)}
                  style={[
                    styles.optionCard,
                    isSelected && styles.optionCardSelected,
                  ]}
                >
                  <View style={styles.optionHeader}>
                    <AppText
                      variant="title"
                      weight="bold"
                      style={[
                        styles.optionDaysText,
                        isSelected && styles.optionDaysTextSelected,
                      ]}
                    >
                      {`${duration} 天`}
                    </AppText>
                    <View
                      style={[
                        styles.quotaBadge,
                        isSelected && styles.quotaBadgeSelected,
                      ]}
                    >
                      <AppText
                        variant="caption"
                        weight="medium"
                        style={[
                          styles.quotaBadgeText,
                          isSelected && styles.quotaBadgeTextSelected,
                        ]}
                      >
                        {`休息額度 ${itemQuota} 次`}
                      </AppText>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* 預覽資訊卡片 */}
          <View style={styles.previewCard}>
            <View style={styles.previewRow}>
              <AppText variant="caption" style={styles.previewLabel}>
                預計期間
              </AppText>
              <AppText variant="body" weight="medium" style={styles.previewValue}>
                {`${formatDetailDate(previewStartDate)} 至 ${formatDetailDate(previewEndDate)}`}
              </AppText>
            </View>

            <View style={styles.previewRow}>
              <AppText variant="caption" style={styles.previewLabel}>
                休息額度
              </AppText>
              <AppText variant="body" weight="medium" style={styles.previewValue}>
                {`${quota} 次`}
              </AppText>
            </View>

            <View style={styles.noticeContainer}>
              <AppText variant="caption" style={styles.noticeText}>
                挑戰開始後，不能中途取消
              </AppText>
            </View>
          </View>
        </View>

        {/* 底部按鈕 */}
        <View style={styles.footer}>
          <Button
            variant="primary"
            onPress={handleStartChallenge}
            disabled={isSubmitting}
            accessibilityLabel="開始挑戰"
            style={styles.actionButton}
          >
            開始挑戰
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
    paddingTop: spacing.lg,
  },
  sectionTitle: {
    color: colors.ink,
    marginBottom: spacing.base,
  },
  optionsContainer: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  optionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.base,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  optionCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionDaysText: {
    color: colors.ink,
  },
  optionDaysTextSelected: {
    color: colors.primary,
  },
  quotaBadge: {
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  quotaBadgeSelected: {
    backgroundColor: colors.surface,
  },
  quotaBadgeText: {
    color: colors.muted,
  },
  quotaBadgeTextSelected: {
    color: colors.primary,
  },
  previewCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewLabel: {
    color: colors.muted,
  },
  previewValue: {
    color: colors.ink,
  },
  noticeContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  noticeText: {
    color: colors.work,
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
});
