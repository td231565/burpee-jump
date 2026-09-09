import { render, fireEvent, act } from '@testing-library/react-native';
import { AudioSettingsModal } from '../src/features/calendar/components/audio-settings-modal';
import type { AudioPreferences } from '../src/data/audio-preferences';

describe('AudioSettingsModal Component', () => {
  const defaultPrefs: AudioPreferences = {
    voice_enabled: true,
    cues_enabled: true,
    music_enabled: true,
  };

  it('呈顯標題「音訊設定」與三個原生 Switch 開關', () => {
    const { getByText } = render(
      <AudioSettingsModal
        visible={true}
        preferences={defaultPrefs}
        onUpdatePreferences={jest.fn()}
        onClose={jest.fn()}
      />
    );

    expect(getByText('音訊設定')).toBeTruthy();
    expect(getByText('導引語音')).toBeTruthy();
    expect(getByText('提示音效')).toBeTruthy();
    expect(getByText('背景音樂')).toBeTruthy();
  });

  it('切換開關時立即觸發 onUpdatePreferences', async () => {
    const onUpdate = jest.fn();
    const { getByLabelText } = render(
      <AudioSettingsModal
        visible={true}
        preferences={defaultPrefs}
        onUpdatePreferences={onUpdate}
        onClose={jest.fn()}
      />
    );

    const voiceSwitch = getByLabelText('導引語音');
    await act(async () => {
      fireEvent(voiceSwitch, 'valueChange', false);
    });

    expect(onUpdate).toHaveBeenCalledWith({
      ...defaultPrefs,
      voice_enabled: false,
    });
  });

  it('點擊關閉按鈕觸發 onClose', () => {
    const onClose = jest.fn();
    const { getByLabelText } = render(
      <AudioSettingsModal
        visible={true}
        preferences={defaultPrefs}
        onUpdatePreferences={jest.fn()}
        onClose={onClose}
      />
    );

    fireEvent.press(getByLabelText('關閉音訊設定'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
