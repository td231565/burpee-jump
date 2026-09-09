import React from 'react';
import { StyleSheet, Text, type TextProps } from 'react-native';
import { colors, typography } from '../../theme/tokens';

export interface AppTextProps extends TextProps {
  variant?: 'caption' | 'body' | 'headline' | 'title' | 'hero';
  color?: keyof typeof colors;
  weight?: keyof typeof typography.fontWeight;
}

export function AppText({
  style,
  variant = 'body',
  color = 'ink',
  weight,
  children,
  ...rest
}: AppTextProps) {
  const variantStyle = styles[variant];
  const colorStyle = { color: colors[color] };
  const weightStyle = weight ? { fontWeight: typography.fontWeight[weight] } : null;

  return (
    <Text
      style={[variantStyle, colorStyle, weightStyle, style]}
      {...rest}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  caption: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.regular,
  },
  body: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.regular,
  },
  headline: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
  },
  title: {
    fontSize: typography.fontSize.title,
    fontWeight: typography.fontWeight.bold,
  },
  hero: {
    fontSize: typography.fontSize.hero,
    fontWeight: typography.fontWeight.bold,
  },
});
