import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { BackHandler } from 'react-native';
import { OnboardingScreen } from '../src/features/onboarding/components/onboarding-screen';

describe('OnboardingScreen (Slice 1 & 2)', () => {
  const defaultProps = {
    initialNickname: null,
    onSaveNickname: jest.fn().mockResolvedValue(undefined),
    onMountStep: jest.fn(),
    onComplete: jest.fn(),
    onDismiss: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('掛載時顯示暱稱步驟，並觸發一次性的 onMountStep', () => {
    const { getByText, getByPlaceholderText } = render(
      <OnboardingScreen {...defaultProps} />
    );

    expect(getByText('想怎麼稱呼你？')).toBeTruthy();
    expect(getByText('之後會用這個名字在首頁和你打招呼。')).toBeTruthy();
    expect(getByText('暱稱（選填）')).toBeTruthy();
    expect(getByPlaceholderText('輸入暱稱')).toBeTruthy();
    expect(getByText('最多 20 個字元')).toBeTruthy();
    expect(getByText('繼續')).toBeTruthy();
    expect(defaultProps.onMountStep).toHaveBeenCalledTimes(1);
  });

  it('空值直接按繼續，不呼叫 onSaveNickname，直接進入教學步驟', async () => {
    const { getByText } = render(
      <OnboardingScreen {...defaultProps} />
    );

    fireEvent.press(getByText('繼續'));

    await waitFor(() => {
      expect(defaultProps.onSaveNickname).not.toHaveBeenCalled();
      expect(getByText('我知道了')).toBeTruthy();
      expect(getByText('每天兩分鐘，走完今天這一小段')).toBeTruthy();
    });
  });

  it('只有空白時按繼續，不呼叫 onSaveNickname，直接進入教學步驟', async () => {
    const { getByText, getByPlaceholderText } = render(
      <OnboardingScreen {...defaultProps} />
    );

    fireEvent.changeText(getByPlaceholderText('輸入暱稱'), '     ');
    fireEvent.press(getByText('繼續'));

    await waitFor(() => {
      expect(defaultProps.onSaveNickname).not.toHaveBeenCalled();
      expect(getByText('我知道了')).toBeTruthy();
    });
  });

  it('輸入暱稱前後有空白時會 trim 並保存，成功後進入教學', async () => {
    const { getByText, getByPlaceholderText } = render(
      <OnboardingScreen {...defaultProps} />
    );

    fireEvent.changeText(getByPlaceholderText('輸入暱稱'), '  小 明  ');
    fireEvent.press(getByText('繼續'));

    await waitFor(() => {
      expect(defaultProps.onSaveNickname).toHaveBeenCalledWith('小 明');
      expect(getByText('我知道了')).toBeTruthy();
    });
  });

  it('支援非拉丁字元與特殊字元', async () => {
    const { getByText, getByPlaceholderText } = render(
      <OnboardingScreen {...defaultProps} />
    );

    fireEvent.changeText(getByPlaceholderText('輸入暱稱'), '🏃 太郎');
    fireEvent.press(getByText('繼續'));

    await waitFor(() => {
      expect(defaultProps.onSaveNickname).toHaveBeenCalledWith('🏃 太郎');
      expect(getByText('我知道了')).toBeTruthy();
    });
  });

  it('既有暱稱會預填；未修改直接按繼續時不重複寫入', async () => {
    const { getByText, getByDisplayValue } = render(
      <OnboardingScreen {...defaultProps} initialNickname="老王" />
    );

    expect(getByDisplayValue('老王')).toBeTruthy();
    fireEvent.press(getByText('繼續'));

    await waitFor(() => {
      expect(defaultProps.onSaveNickname).not.toHaveBeenCalled();
      expect(getByText('我知道了')).toBeTruthy();
    });
  });

  it('既有暱稱清空後按繼續，呼叫 onSaveNickname(null) 保存為 null', async () => {
    const { getByText, getByPlaceholderText } = render(
      <OnboardingScreen {...defaultProps} initialNickname="老王" />
    );

    fireEvent.changeText(getByPlaceholderText('輸入暱稱'), '');
    fireEvent.press(getByText('繼續'));

    await waitFor(() => {
      expect(defaultProps.onSaveNickname).toHaveBeenCalledWith(null);
      expect(getByText('我知道了')).toBeTruthy();
    });
  });

  it('寫入失敗時停留在暱稱步驟，保留草稿並顯示「暱稱未能儲存，請再試一次」', async () => {
    const onSaveNicknameFail = jest.fn().mockRejectedValue(new Error('DB Error'));
    const { getByText, getByPlaceholderText, queryByText } = render(
      <OnboardingScreen {...defaultProps} onSaveNickname={onSaveNicknameFail} />
    );

    fireEvent.changeText(getByPlaceholderText('輸入暱稱'), '小華');
    fireEvent.press(getByText('繼續'));

    await waitFor(() => {
      expect(onSaveNicknameFail).toHaveBeenCalledWith('小華');
      expect(getByText('暱稱未能儲存，請再試一次')).toBeTruthy();
      expect(queryByText('我知道了')).toBeNull();
      expect(getByPlaceholderText('輸入暱稱').props.value).toBe('小華');
    });
  });

  it('右上角關閉鍵在暱稱步驟直接呼叫 onDismiss', () => {
    const { getByLabelText } = render(
      <OnboardingScreen {...defaultProps} />
    );

    fireEvent.press(getByLabelText('關閉'));
    expect(defaultProps.onDismiss).toHaveBeenCalledTimes(1);
  });

  it('右上角關閉鍵在教學步驟直接呼叫 onDismiss', async () => {
    const { getByText, getByLabelText } = render(
      <OnboardingScreen {...defaultProps} />
    );

    fireEvent.press(getByText('繼續'));

    await waitFor(() => {
      expect(getByText('我知道了')).toBeTruthy();
    });

    fireEvent.press(getByLabelText('關閉'));
    expect(defaultProps.onDismiss).toHaveBeenCalledTimes(1);
  });

  it('按下「我知道了」呼叫 onComplete', async () => {
    const { getByText } = render(
      <OnboardingScreen {...defaultProps} />
    );

    fireEvent.press(getByText('繼續'));

    await waitFor(() => {
      expect(getByText('我知道了')).toBeTruthy();
    });

    fireEvent.press(getByText('我知道了'));
    expect(defaultProps.onComplete).toHaveBeenCalled();
  });

  it('Android 返回鍵在暱稱步驟觸發 onDismiss', () => {
    let backHandlerCallback: ((...args: any[]) => any) | null = null;
    jest.spyOn(BackHandler, 'addEventListener').mockImplementation((event, handler) => {
      if (event === 'hardwareBackPress') {
        backHandlerCallback = handler;
      }
      return { remove: jest.fn() } as any;
    });

    render(<OnboardingScreen {...defaultProps} />);

    expect(backHandlerCallback).not.toBeNull();
    act(() => {
      backHandlerCallback?.();
    });

    expect(defaultProps.onDismiss).toHaveBeenCalledTimes(1);
  });
});
