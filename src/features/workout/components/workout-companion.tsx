import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { PixelCharacter } from './pixel-character';
import type { PixelCharacterFrame } from '../pixel-character-data';
import type { WorkoutStatus } from '../use-tabata-timer';

export interface WorkoutCompanionProps {
  status: WorkoutStatus;
  stageType?: 'work' | 'rest';
  reduceMotion?: boolean;
}

const BURPEE_SEQUENCE: PixelCharacterFrame[] = ['idle', 'squat', 'plank', 'tuck', 'jump'];
const REST_SEQUENCE: PixelCharacterFrame[] = ['idle', 'rest'];

const BURPEE_FRAME_DURATION_MS = 500;
const REST_FRAME_DURATION_MS = 800;

export function WorkoutCompanion({
  status,
  stageType = 'work',
  reduceMotion = false,
}: WorkoutCompanionProps) {
  const [frameIndex, setFrameIndex] = useState(0);

  // Phase 3: 訓練陪伴角色為 Reduce Motion 例外，運動與休息仍播放動畫；暫停、準備、保存等維持靜態
  const shouldAnimate = status === 'running';

  const isWork = stageType === 'work';
  const sequence = isWork ? BURPEE_SEQUENCE : REST_SEQUENCE;
  const intervalDuration = isWork ? BURPEE_FRAME_DURATION_MS : REST_FRAME_DURATION_MS;

  useEffect(() => {
    if (!shouldAnimate) {
      return;
    }

    const interval = setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % sequence.length);
    }, intervalDuration);

    return () => {
      clearInterval(interval);
      setFrameIndex(0);
    };
  }, [shouldAnimate, intervalDuration, sequence.length]);

  const currentFrame: PixelCharacterFrame = shouldAnimate
    ? sequence[frameIndex % sequence.length]
    : 'idle';

  return (
    <View
      style={styles.container}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      <PixelCharacter frame={currentFrame} width={76} height={84} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 88,
  },
});
