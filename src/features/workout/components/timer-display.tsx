import { StyleSheet, View } from 'react-native';
import { AppText } from '../../../components/ui/app-text';
import { colors, spacing } from '../../../theme/tokens';
import type { WorkoutStatus } from '../use-tabata-timer';
import type { TabataSnapshot } from '../tabata';

export interface TimerDisplayProps {
  status: WorkoutStatus;
  snapshot: TabataSnapshot;
}

export function TimerDisplay({ status, snapshot }: TimerDisplayProps) {
  if (status === 'preparing') {
    return (
      <View style={styles.container}>
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
  const stageColor = isWork ? colors.work : colors.rest;

  return (
    <View style={styles.container}>
      <AppText variant="headline" style={[styles.roundText, { color: stageColor }]}>
        {`第 ${snapshot.round} / ${snapshot.totalRounds} 組`}
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
  container: {
    width: '100%',
    maxWidth: 320,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
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
