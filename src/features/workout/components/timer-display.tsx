import { StyleSheet, View } from 'react-native';
import { AppText } from '../../../components/ui/app-text';
import { colors, radius, spacing } from '../../../theme/tokens';
import type { WorkoutStatus } from '../use-tabata-timer';
import type { TabataSnapshot } from '../tabata';

export interface TimerDisplayProps {
  status: WorkoutStatus;
  snapshot: TabataSnapshot;
}

export function TimerDisplay({ status, snapshot }: TimerDisplayProps) {
  if (status === 'preparing') {
    return (
      <View style={[styles.card, styles.preparingCard]}>
        <AppText variant="title" style={styles.stageTitle}>
          準備
        </AppText>
        <AppText style={styles.countdownText}>
          {snapshot.remainingSeconds}
        </AppText>
      </View>
    );
  }

  const isWork = snapshot.stageType === 'work';
  const stageCardStyle = isWork ? styles.workCard : styles.restCard;
  const stageColor = isWork ? colors.work : colors.rest;

  return (
    <View style={[styles.card, stageCardStyle]}>
      {status === 'paused' && (
        <View style={styles.pausedBadge}>
          <AppText style={styles.pausedText}>已暫停</AppText>
        </View>
      )}

      <AppText variant="headline" style={[styles.roundText, { color: stageColor }]}>
        {`第 ${snapshot.round} / 4 組`}
      </AppText>

      <AppText variant="title" style={[styles.stageTitle, { color: stageColor }]}>
        {isWork ? '運動' : '休息'}
      </AppText>

      <AppText style={[styles.countdownText, { color: stageColor }]}>
        {snapshot.remainingSeconds}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    aspectRatio: 1,
    maxWidth: 320,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  preparingCard: {
    backgroundColor: colors.todayLight,
    borderColor: colors.todayBorder,
  },
  workCard: {
    backgroundColor: colors.workLight,
    borderColor: colors.work,
  },
  restCard: {
    backgroundColor: colors.restLight,
    borderColor: colors.rest,
  },
  pausedBadge: {
    position: 'absolute',
    top: spacing.base,
    backgroundColor: colors.ink,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  pausedText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: '600',
  },
  roundText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  stageTitle: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: spacing.base,
  },
  countdownText: {
    fontSize: 88,
    fontWeight: '800',
    color: colors.ink,
    lineHeight: 96,
  },
});
