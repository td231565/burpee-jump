import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { AppText } from './app-text';
import { colors, radius } from '../../theme/tokens';

export interface IconButtonProps {
  onPress: () => void;
  accessibilityLabel: string;
  children: React.ReactNode;
  disabled?: boolean;
}

export function IconButton({
  onPress,
  accessibilityLabel,
  children,
  disabled = false,
}: IconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
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
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.94 }],
  },
});
