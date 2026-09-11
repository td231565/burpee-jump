import React from 'react';
import { StyleSheet, View } from 'react-native';
import { natureColors } from '../../theme/tokens';

/**
 * Quiet, programmatic scenery for the two core screens.
 * It stays behind the content and is deliberately excluded from input and
 * accessibility trees so it cannot compete with the calendar or timer.
 */
export function NatureBackdrop() {
  return (
    <View
      testID="nature-backdrop"
      pointerEvents="none"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.root}
    >
      <View style={styles.skyWash} />
      <View style={styles.sun} />
      <View style={styles.foliageLeft}>
        <View style={[styles.leaf, styles.leafLeft]} />
        <View style={[styles.leaf, styles.leafLeftTall]} />
        <View style={[styles.leaf, styles.leafLeftSmall]} />
      </View>
      <View style={styles.foliageRight}>
        <View style={[styles.leaf, styles.leafRight]} />
        <View style={[styles.leaf, styles.leafRightTall]} />
      </View>
      <View style={styles.path} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 0,
  },
  skyWash: {
    position: 'absolute',
    top: -28,
    right: -42,
    width: 180,
    height: 116,
    borderRadius: 90,
    backgroundColor: natureColors.sky,
    opacity: 0.16,
    transform: [{ rotate: '-8deg' }],
  },
  sun: {
    position: 'absolute',
    top: 18,
    right: 28,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: natureColors.sun,
    opacity: 0.16,
  },
  foliageLeft: {
    position: 'absolute',
    left: -28,
    bottom: 34,
    width: 112,
    height: 94,
  },
  foliageRight: {
    position: 'absolute',
    right: -34,
    bottom: 104,
    width: 118,
    height: 94,
  },
  leaf: {
    position: 'absolute',
    backgroundColor: natureColors.foliage,
    opacity: 0.16,
    borderRadius: 999,
  },
  leafLeft: {
    left: 24,
    bottom: 8,
    width: 54,
    height: 24,
    transform: [{ rotate: '-26deg' }],
  },
  leafLeftTall: {
    left: 48,
    bottom: 28,
    width: 24,
    height: 68,
    backgroundColor: natureColors.foliageDeep,
    opacity: 0.13,
    transform: [{ rotate: '18deg' }],
  },
  leafLeftSmall: {
    left: 4,
    bottom: 38,
    width: 40,
    height: 18,
    transform: [{ rotate: '22deg' }],
  },
  leafRight: {
    right: 18,
    bottom: 2,
    width: 56,
    height: 24,
    backgroundColor: natureColors.foliageDeep,
    opacity: 0.13,
    transform: [{ rotate: '22deg' }],
  },
  leafRightTall: {
    right: 52,
    bottom: 26,
    width: 24,
    height: 68,
    transform: [{ rotate: '-16deg' }],
  },
  path: {
    position: 'absolute',
    left: 26,
    bottom: 10,
    width: 110,
    height: 20,
    borderRadius: 999,
    backgroundColor: natureColors.soil,
    opacity: 0.14,
    transform: [{ rotate: '-8deg' }],
  },
});
