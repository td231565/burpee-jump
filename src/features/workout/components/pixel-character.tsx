import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { FRAME_PATHS, type PixelCharacterFrame } from '../pixel-character-data';

export interface PixelCharacterProps {
  frame: PixelCharacterFrame;
  width?: number;
  height?: number;
}

export function PixelCharacter({ frame, width = 80, height = 88 }: PixelCharacterProps) {
  const paths = FRAME_PATHS[frame] || FRAME_PATHS.idle;
  const viewBox =
    frame === 'celebrate'
      ? '-100 -200 200 205'
      : '-80 -175 160 175';

  return (
    <Svg
      width={width}
      height={height}
      viewBox={viewBox}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      {paths.map(({ color, d }, idx) => (
        <Path key={`${frame}-${color}-${idx}`} fill={color} d={d} />
      ))}
    </Svg>
  );
}
