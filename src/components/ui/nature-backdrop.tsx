import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Line, Path } from 'react-native-svg';
import { colors, natureColors } from '../../theme/tokens';

/**
 * Quiet, original scenery for the two core screens.
 * The center stays open for the calendar or timer, while recognizable nature
 * silhouettes sit around the perimeter.
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
      <Svg width="100%" height="100%" viewBox="0 0 390 844" preserveAspectRatio="xMidYMax meet">
        <Path
          d="M238 0H390V174C347 139 298 120 238 115Z"
          fill={natureColors.sky}
          opacity={0.68}
        />

        <G testID="nature-sun" transform="translate(329 76)">
          <G stroke={natureColors.sun} strokeWidth={5} strokeLinecap="round">
            <Line x1={0} y1={-39} x2={0} y2={-51} />
            <Line x1={0} y1={39} x2={0} y2={51} />
            <Line x1={-39} y1={0} x2={-51} y2={0} />
            <Line x1={39} y1={0} x2={51} y2={0} />
            <Line x1={-28} y1={-28} x2={-37} y2={-37} />
            <Line x1={28} y1={-28} x2={37} y2={-37} />
            <Line x1={-28} y1={28} x2={-37} y2={37} />
            <Line x1={28} y1={28} x2={37} y2={37} />
          </G>
          <Circle r={29} fill={natureColors.sun} />
          <Path
            d="M-14 -8C-5 -17 10 -16 17 -4"
            fill="none"
            stroke={colors.canvas}
            strokeWidth={5}
            strokeLinecap="round"
            opacity={0.6}
          />
        </G>

        <G testID="nature-leaves" transform="translate(0 470)">
          <Path
            d="M-10 136C12 103 34 70 91 19"
            fill="none"
            stroke={natureColors.foliageDeep}
            strokeWidth={6}
            strokeLinecap="round"
          />
          <Path
            d="M21 91C-3 83 -13 64 -7 47C14 48 31 62 33 81C29 85 25 88 21 91Z"
            fill={natureColors.foliage}
          />
          <Path
            d="M48 58C49 34 65 18 87 19C92 38 80 57 58 66C55 63 51 60 48 58Z"
            fill={natureColors.foliageDeep}
          />
          <Path
            d="M70 36C57 18 61 -2 77 -14C94 -2 99 17 88 34C82 34 76 35 70 36Z"
            fill={natureColors.foliage}
          />
        </G>

        <G testID="nature-grass">
          <Path
            d="M0 676C54 642 112 658 163 637C225 612 286 646 340 631C357 626 374 627 390 632V844H0Z"
            fill={natureColors.sky}
          />
          <Path
            d="M0 724C55 679 111 714 168 683C225 652 279 703 338 674C355 666 373 664 390 668V844H0Z"
            fill={natureColors.foliage}
          />
          <Path
            d="M0 770C60 725 120 759 181 730C243 700 302 750 352 725C365 719 378 717 390 718V844H0Z"
            fill={natureColors.foliageDeep}
            opacity={0.84}
          />
          <G fill="none" stroke={natureColors.foliageDeep} strokeWidth={4} strokeLinecap="round">
            <Path d="M42 756C39 732 32 719 21 707" />
            <Path d="M42 756C48 731 56 719 68 709" />
            <Path d="M42 756C43 728 44 715 47 699" />
            <Path d="M347 724C344 703 338 691 328 681" />
            <Path d="M347 724C353 701 361 690 373 680" />
            <Path d="M347 724C348 699 350 687 353 674" />
          </G>
        </G>

        <G testID="nature-path">
          <Path
            d="M274 844C258 813 261 782 286 755C308 731 312 710 301 688C346 712 354 741 329 771C310 793 310 816 322 844Z"
            fill={natureColors.soil}
          />
          <Path
            d="M291 844C282 817 287 792 306 772C322 755 326 739 320 723C340 741 338 759 321 778C304 798 304 819 312 844Z"
            fill={colors.canvas}
            opacity={0.56}
          />
        </G>

        <G testID="nature-stones" transform="translate(312 778)">
          <Path d="M0 31C-1 12 12 -3 30 -1C46 1 54 14 50 31Z" fill="#B3ADA4" />
          <Path d="M10 16C16 6 27 4 36 9" fill="none" stroke="#D8D3CB" strokeWidth={5} strokeLinecap="round" />
          <Path d="M51 31C50 19 60 10 72 11C83 12 90 21 88 31Z" fill="#CEC7BB" />
        </G>

        <G testID="nature-flower" transform="translate(92 742)">
          <Line y1={17} y2={-10} stroke={natureColors.foliageDeep} strokeWidth={3} strokeLinecap="round" />
          <Ellipse cy={-15} rx={5} ry={8} fill="#E9A9A7" />
          <Ellipse cx={7} cy={-9} rx={8} ry={5} fill="#E9A9A7" />
          <Ellipse cy={-3} rx={5} ry={8} fill="#E9A9A7" />
          <Ellipse cx={-7} cy={-9} rx={8} ry={5} fill="#E9A9A7" />
          <Circle cy={-9} r={4} fill={natureColors.sun} />
        </G>
      </Svg>
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
});
