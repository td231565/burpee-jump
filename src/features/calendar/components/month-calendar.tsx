import React, { useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { AppText } from '../../../components/ui/app-text';
import { colors, radius, spacing } from '../../../theme/tokens';
import { generateMonthGrid } from '../date-utils';
import { CalendarDay } from './calendar-day';

const WEEK_DAYS = ['一', '二', '三', '四', '五', '六', '日'];

export interface MonthCalendarProps {
  year: number;
  month: number;
  today?: Date;
  completionsMap?: Record<string, boolean>;
  restDaysMap?: Record<string, boolean>;
  challengeStartDate?: string | null;
  challengeEndDate?: string | null;
  pendingActionDate?: string | null;
  onSelectDate?: (localDate: string) => void;
  header?: React.ReactNode;
  errorContent?: React.ReactNode;
}

export function MonthCalendar({
  year,
  month,
  today = new Date(),
  completionsMap = {},
  restDaysMap = {},
  challengeStartDate = null,
  challengeEndDate = null,
  pendingActionDate = null,
  onSelectDate,
  header,
  errorContent,
}: MonthCalendarProps) {
  const { width } = useWindowDimensions();
  const isNarrow = width < 360;

  const cells = useMemo(
    () => generateMonthGrid(year, month, today),
    [year, month, today]
  );

  return (
    <View style={[styles.container, isNarrow && styles.containerNarrow]}>
      {header}
      {errorContent ? (
        errorContent
      ) : (
        <>
          {/* 星期列表頭 (週一至週日) */}
          <View style={styles.weekHeader}>
            {WEEK_DAYS.map((dayName) => (
              <View key={dayName} style={styles.weekDayHeaderCell}>
                <AppText variant="caption" weight="medium" style={styles.weekDayText}>
                  {dayName}
                </AppText>
              </View>
            ))}
          </View>

          {/* 動態 28 / 35 / 42 格日曆網格 */}
          <View style={styles.grid}>
        {cells.map((cell) => {
          const isChallengeRange =
            !!(
              challengeStartDate &&
              challengeEndDate &&
              cell.localDate >= challengeStartDate &&
              cell.localDate <= challengeEndDate
            );

          return (
            <CalendarDay
              key={cell.localDate}
              localDate={cell.localDate}
              day={cell.day}
              isCurrentMonth={cell.isCurrentMonth}
              isToday={cell.isToday}
              isPast={cell.isPast}
              isFuture={cell.isFuture}
              isCompleted={!!completionsMap[cell.localDate]}
              isRest={!!restDaysMap[cell.localDate]}
              isChallengeRange={isChallengeRange}
              hasPendingAction={cell.localDate === pendingActionDate}
              onPress={onSelectDate}
            />
          );
        })}
      </View>
    </>
  )}
</View>
);
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  containerNarrow: {
    padding: spacing.xs,
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingBottom: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    marginBottom: spacing.xs,
  },
  weekDayHeaderCell: {
    width: '14.2857%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  weekDayText: {
    color: colors.muted,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
});
