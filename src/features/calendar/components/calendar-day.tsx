import React, { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
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
  isRest?: boolean;
  isChallengeRange?: boolean;
  hasPendingAction?: boolean;
  onPress?: (localDate: string) => void;
}

export function CalendarDay({
  localDate,
  day,
  isCurrentMonth,
  isToday,
  isPast,
  isFuture,
  isCompleted = false,
  isRest = false,
  isChallengeRange = false,
  hasPendingAction = false,
  onPress,
}: CalendarDayProps) {
  const isInteractive = isCurrentMonth && !isFuture;

  const [reduceMotion, setReduceMotion] = useState(false);
  const [pulseAnim] = useState(() => new Animated.Value(1));

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

  useEffect(() => {
    if (hasPendingAction && !reduceMotion) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.25,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [hasPendingAction, reduceMotion, pulseAnim]);

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
    } else if (isRest) {
      parts.push('休息日');
    }
    if (isChallengeRange) {
      parts.push('挑戰期間');
    }
    if (hasPendingAction) {
      parts.push('可補登休息');
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
          isRest && !isCompleted && styles.restIndicator,
          isToday && !isCompleted && !isRest && styles.todayIndicator,
        ]}
      >
        <AppText
          variant="caption"
          weight={isToday || isCompleted || isRest ? 'bold' : 'medium'}
          style={[
            styles.dayText,
            !isCurrentMonth && styles.dayTextMuted,
            isToday && !isCompleted && !isRest && styles.dayTextToday,
            isCompleted && styles.dayTextCompleted,
            isRest && !isCompleted && styles.dayTextRest,
          ]}
        >
          {day}
        </AppText>
        {isCompleted && (
          <AppText variant="caption" weight="bold" style={styles.checkmark}>
            ✓
          </AppText>
        )}
        {isRest && !isCompleted && (
          <AppText variant="caption" weight="bold" style={styles.restMark}>
            休
          </AppText>
        )}

        {/* 待處理操作閃爍圓點 */}
        {hasPendingAction && (
          <Animated.View
            style={[
              styles.pendingActionDot,
              { opacity: reduceMotion ? 1 : pulseAnim },
            ]}
          />
        )}
      </View>

      {/* 挑戰期間底部範圍提示標記 */}
      {isChallengeRange && isCurrentMonth && (
        <View style={styles.rangeBar} accessibilityLabel="挑戰期間" />
      )}
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
    position: 'relative',
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
    position: 'relative',
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
  restIndicator: {
    backgroundColor: colors.restLight,
    borderWidth: 1.5,
    borderColor: colors.rest,
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
  dayTextRest: {
    color: colors.rest,
  },
  checkmark: {
    fontSize: 10,
    lineHeight: 12,
    color: colors.success,
    marginTop: -2,
  },
  restMark: {
    fontSize: 9,
    lineHeight: 11,
    color: colors.rest,
    marginTop: -2,
  },
  pendingActionDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.today,
  },
  rangeBar: {
    position: 'absolute',
    bottom: 2,
    left: 6,
    right: 6,
    height: 2.5,
    borderRadius: 1.5,
    backgroundColor: colors.primary,
  },
});
