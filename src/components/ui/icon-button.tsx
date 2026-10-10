import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { AppText } from './app-text';
import { colors, radius } from '../../theme/tokens';

export interface IconButtonProps {
  onPress: () => void;
  accessibilityLabel: string;
  children: React.ReactNode;
  disabled?: boolean;
  variant?: 'default' | 'jelly';
  tone?: 'green' | 'yellow' | 'red';
}

const jellyColors = {
  green: { surface: colors.successLight, edge: '#B5DDBF' },
  yellow: { surface: colors.todayLight, edge: '#E8D69A' },
  red: { surface: colors.workLight, edge: '#EFBAC4' },
};

export function IconButton({
  onPress,
  accessibilityLabel,
  children,
  disabled = false,
  variant = 'default',
  tone = 'green',
}: IconButtonProps) {
  const palette = jellyColors[tone];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={variant === 'jelly' ? { top: 6, bottom: 6 } : undefined}
      style={({ pressed }) => [
        styles.button,
        variant === 'jelly' && styles.jelly,
        variant === 'jelly' && {
          backgroundColor: palette.surface,
          borderColor: palette.edge,
          boxShadow: `0 3px 0 ${palette.edge}, 0 5px 8px rgba(30, 41, 59, 0.08), inset 0 2px 2px ${colors.canvas}`,
        },
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        variant === 'jelly' && pressed && !disabled && styles.jellyPressed,
        variant === 'jelly' && pressed && !disabled && {
          boxShadow: `0 1px 0 ${palette.edge}, inset 0 2px 3px rgba(30, 41, 59, 0.08)`,
        },
      ]}
    >
      {typeof children === 'string' ? (
        <AppText variant="headline" style={styles.text}>
          {children}
        </AppText>
      ) : (
        children
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minWidth: 44,
    minHeight: 44,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: colors.surfaceSubtle,
  },
  text: {
    color: colors.ink,
  },
  jelly: {
    minHeight: 32,
    height: 32,
    borderRadius: radius.sm,
    borderCurve: 'continuous',
    borderWidth: 1,
  },
  jellyPressed: {
    opacity: 1,
    transform: [{ translateY: 2 }, { scale: 0.96 }],
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.94 }],
  },
});
