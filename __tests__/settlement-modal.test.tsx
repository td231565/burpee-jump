import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { fireEvent, render, screen, act } from '@testing-library/react-native';
import { SettlementModal } from '../src/features/challenge/components/settlement-modal';

describe('SettlementModal (Slice 5)', () => {
  const defaultProps = {
    visible: true,
    outcome: 'completed' as const,
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('已完成狀態渲染正確標題與副文，初始顯示「跳過」按鈕', () => {
    render(<SettlementModal {...defaultProps} outcome="completed" />);

    expect(screen.getByText('已完成')).toBeTruthy();
    expect(screen.getByText('挑戰完成！用這個節奏繼續前進')).toBeTruthy();
    expect(screen.getByText('跳過')).toBeTruthy();

    fireEvent.press(screen.getByText('跳過'));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('未完成狀態渲染正確標題與副文', () => {
    render(<SettlementModal {...defaultProps} outcome="uncompleted" />);

    expect(screen.getByText('未完成')).toBeTruthy();
    expect(screen.getByText('這輪挑戰結束了，一起準備下一次吧。')).toBeTruthy();
  });

  it('動畫與延遲時間過後，「跳過」轉為「回到首頁」按鈕', () => {
    render(<SettlementModal {...defaultProps} />);

    expect(screen.getByText('跳過')).toBeTruthy();

    // 快進動畫 (800ms) + 延遲 (300ms)
    act(() => {
      jest.advanceTimersByTime(1200);
    });

    const homeButton = screen.getByRole('button', { name: '回到首頁' });
    expect(homeButton).toBeTruthy();

    fireEvent.press(homeButton);
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('啟用減少動態效果時，直接顯示「回到首頁」按鈕', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);

    render(<SettlementModal {...defaultProps} />);

    // 等待 AccessibilityInfo Promise 解析
    await act(async () => {
      jest.runAllTicks();
    });

    expect(screen.getByRole('button', { name: '回到首頁' })).toBeTruthy();
  });
});
