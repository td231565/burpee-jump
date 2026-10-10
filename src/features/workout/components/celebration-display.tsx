import React, { useEffect, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';
import { CELEBRATE_PATHS } from '../pixel-character-data';

export interface CelebrationDisplayProps {
  reduceMotion?: boolean;
}

export function CelebrationDisplay({ reduceMotion = false }: CelebrationDisplayProps) {
  const [animValue] = useState(() => new Animated.Value(reduceMotion ? 1 : 0));

  useEffect(() => {
    if (reduceMotion) {
      animValue.setValue(1);
      return;
    }

    Animated.timing(animValue, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, [animValue, reduceMotion]);

  const animatedStyle = {
    opacity: animValue,
    transform: [
      {
        translateY: animValue.interpolate({
          inputRange: [0, 1],
          outputRange: [12, 0],
        }),
      },
    ],
  };

  return (
    <View
      style={styles.container}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      <Animated.View style={animatedStyle}>
        <Svg
          width={180}
          height={210}
          viewBox="-160 -360 320 375"
          accessible={false}
          importantForAccessibility="no-hide-descendants"
        >
          {/* 低對比日出背景 */}
          <Circle cx={0} cy={-195} r={140} fill="#FEF9C3" opacity={0.45} />
          <Circle cx={0} cy={-195} r={105} fill="#F1D997" opacity={0.6} />
          <Circle cx={0} cy={-195} r={72} fill="#FDE047" opacity={0.8} />

          {/* 晨光放射光芒 */}
          <Path
            d="M-85 -280 L-110 -305 M85 -280 L110 -305 M0 -320 L0 -350 M-125 -195 L-155 -195 M125 -195 L155 -195"
            stroke="#F1D997"
            strokeWidth={6}
            strokeLinecap="round"
          />

          {/* 像素風展示肌肉完成小人 */}
          <G scale={1.8}>
            {CELEBRATE_PATHS.map(({ color, d }, idx) => (
              <Path key={`celebrate-${color}-${idx}`} fill={color} d={d} />
            ))}
          </G>
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
});
