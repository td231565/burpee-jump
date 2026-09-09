import React from 'react';
import {
  Pressable,
  StyleSheet,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colors, radius, spacing, typography } from '../../theme/tokens';
import { AppText } from './app-text';

export interface ButtonProps {
  onPress?: (event: GestureResponderEvent) => void;
  children: string;
  disabled?: boolean;
  accessibilityLabel?: string;
  variant?: 'primary' | 'secondary' | 'disabled';
  style?: StyleProp<ViewStyle>;
}

export function Button({
  onPress,
  children,
  disabled = false,
  accessibilityLabel,
  variant = 'primary',
  style,
}: ButtonProps) {
  const isActionDisabled = disabled || variant === 'disabled';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? children}
      accessibilityState={{ disabled: isActionDisabled }}
      disabled={isActionDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        isActionDisabled && styles.disabled,
        pressed && !isActionDisabled && styles.pressed,
        style,
      ]}
    >
      <AppText
        variant="headline"
        style={[
          styles.text,
          variant === 'primary' && styles.primaryText,
          variant === 'secondary' && styles.secondaryText,
          isActionDisabled && styles.disabledText,
        ]}
      >
        {children}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    minWidth: 44,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  text: {
    textAlign: 'center',
  },
  primary: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryBorder,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryText: {
    color: '#FFFFFF',
    fontWeight: typography.fontWeight.semibold,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  secondaryText: {
    color: colors.ink,
    fontWeight: typography.fontWeight.medium,
  },
  disabled: {
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  disabledText: {
    color: colors.muted,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
