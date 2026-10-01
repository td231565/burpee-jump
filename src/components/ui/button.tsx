import React from 'react';
import {
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colors, radius, spacing, typography } from '../../theme/tokens';
import { AppText } from './app-text';

export interface ButtonProps {
  onPress?: (event: GestureResponderEvent) => void;
  children: React.ReactNode;
  iconRight?: React.ReactNode;
  disabled?: boolean;
  accessibilityLabel?: string;
  variant?: 'primary' | 'secondary' | 'disabled';
  style?: StyleProp<ViewStyle>;
}

export function Button({
  onPress,
  children,
  iconRight,
  disabled = false,
  accessibilityLabel,
  variant = 'primary',
  style,
}: ButtonProps) {
  const isActionDisabled = disabled || variant === 'disabled';
  const { fontScale } = useWindowDimensions();

  // Phase 3: 每側留白最多 24dp (spacing.lg)，大字級時優先縮減左右留白以保留單行文字
  const horizontalPadding =
    fontScale > 1.5 ? spacing.sm : fontScale > 1.2 ? spacing.md : spacing.lg;

  const defaultLabel = typeof children === 'string' ? children : undefined;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? defaultLabel}
      accessibilityState={{ disabled: isActionDisabled }}
      disabled={isActionDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        { paddingHorizontal: horizontalPadding },
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        isActionDisabled && styles.disabled,
        pressed && !isActionDisabled && styles.pressed,
        style,
      ]}
    >
      <View style={styles.contentRow}>
        {typeof children === 'string' ? (
          <AppText
            variant="headline"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.65}
            style={[
              styles.text,
              variant === 'primary' && styles.primaryText,
              variant === 'secondary' && styles.secondaryText,
              isActionDisabled && styles.disabledText,
            ]}
          >
            {children}
          </AppText>
        ) : (
          children
        )}
        {iconRight}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  base: {
    minHeight: 52,
    minWidth: 44,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
    alignSelf: 'center',
    maxWidth: '100%',
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
