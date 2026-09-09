import { render } from '@testing-library/react-native';
import AudioTestScreen from '../src/app/audio-test';

// Mock expo-audio for unit testing environment
jest.mock('expo-audio', () => ({
  useAudioPlayer: jest.fn(() => ({
    loop: false,
    play: jest.fn(),
    pause: jest.fn(),
    seekTo: jest.fn().mockResolvedValue(undefined),
    addListener: jest.fn(() => ({ remove: jest.fn() })),
  })),
  useAudioPlayerStatus: jest.fn(() => ({
    playing: false,
    currentTime: 0,
    duration: 10,
    didJustFinish: false,
  })),
  setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
  setIsAudioActiveAsync: jest.fn().mockResolvedValue(undefined),
}));

describe('AudioTestScreen (Phase 1.5)', () => {
  it('renders audio verification screen with all contract sections', () => {
    const { getByText } = render(<AudioTestScreen />);

    expect(getByText('MVP 音訊技術驗證')).toBeTruthy();
    expect(getByText('契約 1 & 2：本機循環與 doNotMix')).toBeTruthy();
    expect(getByText('契約 3：短語音／提示 duckOthers 恢復')).toBeTruthy();
    expect(getByText('契約 4 & 5：生命週期暫停與靜音模式')).toBeTruthy();
    expect(getByText('即時事件日誌')).toBeTruthy();
  });
});
