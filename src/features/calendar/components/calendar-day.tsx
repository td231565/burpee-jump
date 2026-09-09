import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '../../../components/ui/app-text';
import { colors, radius } from '../../../theme/tokens';

export interface CalendarDayProps {
  localDate: string;
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isPast: boolean;
  isFuture: boolean;
  isCompleted?: boolean;
  onPress?: (localDate: string) => void;
}

export function CalendarDay({
  localDate,
  day,
  isCurrentMonth,
  isToday,
  isPast: _isPast,
  isFuture,
  isCompleted = false,
  onPress,
}: CalendarDayProps) {
  const isInteractive = isCurrentMonth && !isFuture;

  const getAccessibilityLabel = () => {
    if (!isCurrentMonth) {
      return `${day} 日 非本月`;
    }
    const parts = [`${day} 日`];
    if (isToday) {
      parts.push('今天');
    }
    if (isCompleted) {
      parts.push('已完成');
    }
    return parts.join(' ');
  };

  const handlePress = () => {
    if (isInteractive && onPress) {
      onPress(localDate);
    }
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={getAccessibilityLabel()}
      accessibilityState={{ disabled: !isInteractive }}
      disabled={!isInteractive}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.cell,
        !isCurrentMonth && styles.cellMuted,
        isInteractive && pressed && styles.cellPressed,
      ]}
    >
      <View
        style={[
          styles.dayIndicator,
          isCompleted && styles.completedIndicator,
          isToday && !isCompleted && styles.todayIndicator,
        ]}
      >
        <AppText
          variant="caption"
          weight={isToday || isCompleted ? 'bold' : 'medium'}
          style={[
            styles.dayText,
            !isCurrentMonth && styles.dayTextMuted,
            isToday && !isCompleted && styles.dayTextToday,
            isCompleted && styles.dayTextCompleted,
          ]}
        >
          {day}
        </AppText>
        {isCompleted && (
          <AppText variant="caption" weight="bold" style={styles.checkmark}>
            ✓
          </AppText>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cell: {
    minWidth: 44,
    minHeight: 44,
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  cellMuted: {
    opacity: 0.35,
  },
  cellPressed: {
    transform: [{ scale: 0.95 }],
    opacity: 0.8,
  },
  dayIndicator: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayIndicator: {
    backgroundColor: colors.todayLight,
    borderWidth: 1.5,
    borderColor: colors.todayBorder,
  },
  completedIndicator: {
    backgroundColor: colors.successLight,
    borderWidth: 1.5,
    borderColor: colors.success,
  },
  dayText: {
    color: colors.ink,
  },
  dayTextMuted: {
    color: colors.muted,
  },
  dayTextToday: {
    color: colors.today,
  },
  dayTextCompleted: {
    color: colors.success,
  },
  checkmark: {
    fontSize: 10,
    lineHeight: 12,
    color: colors.success,
    marginTop: -2,
  },
});
