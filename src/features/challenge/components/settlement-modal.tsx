import React, { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';
import { AppText } from '../../../components/ui/app-text';
import { Button } from '../../../components/ui/button';
import { spacing } from '../../../theme/tokens';
import type { SettlementOutcome } from '../../../data/challenge-types';

export interface SettlementModalProps {
  visible: boolean;
  outcome: SettlementOutcome;
  onClose: () => void;
}

export function SettlementModal({
  visible,
  outcome,
  onClose,
}: SettlementModalProps) {
  const [reduceMotion, setReduceMotion] = useState(false);
  const [showHomeButton, setShowHomeButton] = useState(false);

  const [opacity] = useState(() => new Animated.Value(0));
  const [scale] = useState(() => new Animated.Value(0.9));

  useEffect(() => {
    let isMounted = true;
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((enabled) => {
        if (isMounted) setReduceMotion(enabled);
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!visible || reduceMotion) return;

    opacity.setValue(0);
    scale.setValue(0.9);

    const anim = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]);

    anim.start();

    // 進場動畫 0.8s + 0.3s 等待後切換至「回到首頁」按鈕
    const timer = setTimeout(() => {
      setShowHomeButton(true);
    }, 1100);

    return () => {
      anim.stop();
      clearTimeout(timer);
    };
  }, [visible, reduceMotion, opacity, scale]);

  const handleClose = () => {
    setShowHomeButton(false);
    onClose();
  };

  if (!visible) return null;

  const isCompleted = outcome === 'completed';
  const isHomeButtonVisible = reduceMotion || showHomeButton;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={styles.fullscreen}>
        <Animated.View
          style={[
            styles.contentContainer,
            {
              opacity: reduceMotion ? 1 : opacity,
              transform: [{ scale: reduceMotion ? 1 : scale }],
            },
          ]}
        >
          {/* 中央靜態 SVG 圖案 */}
          <View style={styles.svgWrapper}>
            {isCompleted ? (
              /* 已完成：金色徽章與背後日光 */
              <Svg width={200} height={200} viewBox="0 0 200 200">
                <Defs>
                  <LinearGradient id="sunbeam" x1="0%" y1="0%" x2="100%" y2="100%">
                    <Stop offset="0%" stopColor="#FDE047" stopOpacity={0.6} />
                    <Stop offset="100%" stopColor="#F59E0B" stopOpacity={0.1} />
                  </LinearGradient>
                  <LinearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <Stop offset="0%" stopColor="#FDE68A" />
                    <Stop offset="50%" stopColor="#F59E0B" />
                    <Stop offset="100%" stopColor="#D97706" />
                  </LinearGradient>
                </Defs>
                {/* 放射日光光芒 */}
                <G opacity={0.8}>
                  <Circle cx="100" cy="100" r="85" fill="url(#sunbeam)" />
                  <Path
                    d="M 100 10 L 100 190 M 10 100 L 190 100 M 36 36 L 164 164 M 36 164 L 164 36"
                    stroke="#FDE047"
                    strokeWidth={1.5}
                    opacity={0.4}
                  />
                </G>
                {/* 金色徽章本體 */}
                <Circle
                  cx="100"
                  cy="100"
                  r="52"
                  fill="url(#goldGrad)"
                  stroke="#FDE68A"
                  strokeWidth={3}
                />
                {/* 徽章內圈與勝利星芒 */}
                <Circle
                  cx="100"
                  cy="100"
                  r="42"
                  fill="none"
                  stroke="#FEF3C7"
                  strokeWidth={1.5}
                  strokeDasharray="4 2"
                />
                <Path
                  d="M 100 72 L 105 88 L 122 88 L 108 98 L 113 114 L 100 104 L 87 114 L 92 98 L 78 88 L 95 88 Z"
                  fill="#FFFBEB"
                />
              </Svg>
            ) : (
              /* 未完成：柔和地平線與初升曙光 */
              <Svg width={200} height={200} viewBox="0 0 200 200">
                <Defs>
                  <LinearGradient id="dawnGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <Stop offset="0%" stopColor="#FB7185" stopOpacity={0.7} />
                    <Stop offset="50%" stopColor="#F472B6" stopOpacity={0.3} />
                    <Stop offset="100%" stopColor="#38BDF8" stopOpacity={0.05} />
                  </LinearGradient>
                  <LinearGradient id="sunGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <Stop offset="0%" stopColor="#FDE047" />
                    <Stop offset="100%" stopColor="#FB923C" />
                  </LinearGradient>
                </Defs>
                {/* 曙光天空 */}
                <Circle cx="100" cy="100" r="80" fill="url(#dawnGrad)" />
                {/* 初升太陽 */}
                <Path
                  d="M 70 125 A 30 30 0 0 1 130 125 Z"
                  fill="url(#sunGrad)"
                  opacity={0.9}
                />
                {/* 柔和地平線 */}
                <Rect x="30" y="124" width="140" height="2.5" rx="1.2" fill="#E2E8F0" opacity={0.6} />
                <Rect x="50" y="132" width="100" height="1.5" rx="0.7" fill="#94A3B8" opacity={0.3} />
              </Svg>
            )}
          </View>

          {/* 標題與副文 */}
          <AppText variant="hero" weight="bold" style={styles.title}>
            {isCompleted ? '已完成' : '未完成'}
          </AppText>

          <AppText variant="body" style={styles.subtitle}>
            {isCompleted
              ? '挑戰完成！用這個節奏繼續前進'
              : '這輪挑戰結束了，一起準備下一次吧。'}
          </AppText>

          {/* 底部操作區：進場期間為小字跳過，0.3 秒後轉為回到首頁 */}
          <View style={styles.actionContainer}>
            {isHomeButtonVisible ? (
              <Button
                variant="primary"
                onPress={handleClose}
                accessibilityLabel="回到首頁"
                style={styles.homeButton}
              >
                回到首頁
              </Button>
            ) : (
              <Pressable
                onPress={handleClose}
                accessibilityRole="button"
                accessibilityLabel="跳過"
                style={styles.skipButton}
              >
                <AppText variant="caption" style={styles.skipText}>
                  跳過
                </AppText>
              </Pressable>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fullscreen: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  contentContainer: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },
  svgWrapper: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    color: '#F8FAFC',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: spacing.xl * 1.5,
    paddingHorizontal: spacing.base,
    lineHeight: 24,
  },
  actionContainer: {
    width: '100%',
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeButton: {
    width: '100%',
    minHeight: 48,
  },
  skipButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
  },
  skipText: {
    color: '#64748B',
  },
});
