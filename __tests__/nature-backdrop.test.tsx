import React from 'react';
import { render } from '@testing-library/react-native';
import { NatureBackdrop } from '../src/components/ui/nature-backdrop';

describe('NatureBackdrop', () => {
  it('renders the approved nature elements without joining the interaction or accessibility trees', () => {
    const { UNSAFE_getByProps } = render(<NatureBackdrop />);
    const backdrop = UNSAFE_getByProps({ testID: 'nature-backdrop' });

    expect(backdrop.props.pointerEvents).toBe('none');
    expect(backdrop.props.accessible).toBe(false);
    expect(backdrop.props.accessibilityElementsHidden).toBe(true);
    expect(backdrop.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(UNSAFE_getByProps({ testID: 'nature-sun' })).toBeTruthy();
    expect(UNSAFE_getByProps({ testID: 'nature-grass' })).toBeTruthy();
    expect(UNSAFE_getByProps({ testID: 'nature-leaves' })).toBeTruthy();
    expect(UNSAFE_getByProps({ testID: 'nature-path' })).toBeTruthy();
    expect(UNSAFE_getByProps({ testID: 'nature-stones' })).toBeTruthy();
  });
});
