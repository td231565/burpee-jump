import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { SettingsModal } from '../src/features/settings/components/settings-modal';
import type { AudioPreferences } from '../src/data/audio-preferences';

describe('SettingsModal Component (Slice 5)', () => {
  const defaultPrefs: AudioPreferences = {
    voice_enabled: true,
    cues_enabled: true,
    music_enabled: true,
  };

  const defaultProps = {
    visible: true,
    preferences: defaultPrefs,
    onUpdatePreferences: jest.fn(),
    onLoadProfile: jest.fn().mockResolvedValue({ nickname: '小明' }),
    onUpdateNickname: jest.fn().mockResolvedValue(undefined),
    onClose: jest.fn(),
    initialNickname: '小明',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('呈現標題「設定」與「個人資料」、「音訊」兩大區域', async () => {
    const { getByText } = render(<SettingsModal {...defaultProps} />);

    await waitFor(() => {
      expect(getByText('設定')).toBeTruthy();
      expect(getByText('個人資料')).toBeTruthy();
      expect(getByText('音訊')).toBeTruthy();
      expect(getByText('導引語音')).toBeTruthy();
      expect(getByText('提示音效')).toBeTruthy();
      expect(getByText('背景音樂')).toBeTruthy();
    });
  });

  it('開啟時呼叫 onLoadProfile 讀取個人資料並填入輸入框', async () => {
    const onLoadProfile = jest.fn().mockResolvedValue({ nickname: '小美' });
    const { getByDisplayValue } = render(
      <SettingsModal {...defaultProps} onLoadProfile={onLoadProfile} initialNickname={null} />
    );

    expect(onLoadProfile).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(getByDisplayValue('小美')).toBeTruthy();
    });
  });

  it('切換音訊開關時立即觸發 onUpdatePreferences', async () => {
    const onUpdatePrefs = jest.fn();
    const { getByLabelText, getByDisplayValue } = render(
      <SettingsModal {...defaultProps} onUpdatePreferences={onUpdatePrefs} />
    );

    await waitFor(() => {
      expect(getByDisplayValue('小明')).toBeTruthy();
    });

    const voiceSwitch = getByLabelText('導引語音');
    await act(async () => {
      fireEvent(voiceSwitch, 'valueChange', false);
    });

    expect(onUpdatePrefs).toHaveBeenCalledWith({
      ...defaultPrefs,
      voice_enabled: false,
    });
  });

  it('未修改暱稱時，「更新暱稱」按鈕為 disabled', async () => {
    const { getByDisplayValue, getByRole } = render(<SettingsModal {...defaultProps} />);

    await waitFor(() => {
      expect(getByDisplayValue('小明')).toBeTruthy();
    });

    const updateBtn = getByRole('button', { name: '更新暱稱' });
    expect(updateBtn.props.accessibilityState?.disabled).toBe(true);
  });

  it('修改暱稱後，「更新暱稱」按鈕啟用，點擊後觸發 onUpdateNickname 並顯示「暱稱已更新」', async () => {
    const onUpdateNickname = jest.fn().mockResolvedValue(undefined);
    const { getByText, getByPlaceholderText, getByRole } = render(
      <SettingsModal {...defaultProps} onUpdateNickname={onUpdateNickname} />
    );

    await waitFor(() => {
      expect(getByPlaceholderText('輸入暱稱').props.value).toBe('小明');
    });

    fireEvent.changeText(getByPlaceholderText('輸入暱稱'), '大明');

    const updateBtn = getByRole('button', { name: '更新暱稱' });
    expect(updateBtn.props.accessibilityState?.disabled).toBeFalsy();

    await act(async () => {
      fireEvent.press(updateBtn);
    });

    expect(onUpdateNickname).toHaveBeenCalledWith('大明');
    await waitFor(() => {
      expect(getByText('暱稱已更新')).toBeTruthy();
      expect(getByRole('button', { name: '更新暱稱' }).props.accessibilityState?.disabled).toBe(true);
    });
  });

  it('清空既有暱稱並點擊更新，傳入 null 儲存', async () => {
    const onUpdateNickname = jest.fn().mockResolvedValue(undefined);
    const { getByText, getByPlaceholderText } = render(
      <SettingsModal {...defaultProps} onUpdateNickname={onUpdateNickname} />
    );

    await waitFor(() => {
      expect(getByPlaceholderText('輸入暱稱').props.value).toBe('小明');
    });

    fireEvent.changeText(getByPlaceholderText('輸入暱稱'), '   ');

    const updateBtn = getByText('更新暱稱');
    await act(async () => {
      fireEvent.press(updateBtn);
    });

    expect(onUpdateNickname).toHaveBeenCalledWith(null);
  });

  it('儲存暱稱失敗時顯示「暱稱未能儲存，請再試一次」，並保留輸入內容', async () => {
    const onUpdateNicknameFail = jest.fn().mockRejectedValue(new Error('Save failed'));
    const { getByText, getByPlaceholderText } = render(
      <SettingsModal {...defaultProps} onUpdateNickname={onUpdateNicknameFail} />
    );

    await waitFor(() => {
      expect(getByPlaceholderText('輸入暱稱').props.value).toBe('小明');
    });

    fireEvent.changeText(getByPlaceholderText('輸入暱稱'), '小華');
    const updateBtn = getByText('更新暱稱');

    await act(async () => {
      fireEvent.press(updateBtn);
    });

    expect(onUpdateNicknameFail).toHaveBeenCalledWith('小華');
    await waitFor(() => {
      expect(getByText('暱稱未能儲存，請再試一次')).toBeTruthy();
      expect(getByPlaceholderText('輸入暱稱').props.value).toBe('小華');
    });
  });

  it('讀取失敗時顯示「個人資料讀取失敗」，所有區域仍完整顯示', async () => {
    const onLoadProfileFail = jest.fn().mockRejectedValue(new Error('Load failed'));
    const { getByText } = render(
      <SettingsModal {...defaultProps} onLoadProfile={onLoadProfileFail} />
    );

    await waitFor(() => {
      expect(getByText('個人資料讀取失敗')).toBeTruthy();
      expect(getByText('個人資料')).toBeTruthy();
      expect(getByText('音訊')).toBeTruthy();
    });
  });

  it('點擊關閉按鈕觸發 onClose', async () => {
    const onClose = jest.fn();
    const { getByLabelText, getByDisplayValue } = render(
      <SettingsModal {...defaultProps} onClose={onClose} />
    );

    await waitFor(() => {
      expect(getByDisplayValue('小明')).toBeTruthy();
    });

    fireEvent.press(getByLabelText('關閉設定'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
