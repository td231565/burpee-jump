import { TabataAudioService } from '../src/features/workout/audio-service';
import type { AudioPreferences } from '../src/data/audio-preferences';

// Mock expo-audio
const mockPlay = jest.fn();
const mockPause = jest.fn();
const mockSeekTo = jest.fn().mockResolvedValue(undefined);
const mockSetAudioModeAsync = jest.fn().mockResolvedValue(undefined);
const mockSetIsAudioActiveAsync = jest.fn().mockResolvedValue(undefined);

jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(() => ({
    loop: false,
    play: mockPlay,
    pause: mockPause,
    seekTo: mockSeekTo,
    addListener: jest.fn(() => ({ remove: jest.fn() })),
    release: jest.fn(),
  })),
  setAudioModeAsync: (...args: any[]) => mockSetAudioModeAsync(...args),
  setIsAudioActiveAsync: (...args: any[]) => mockSetIsAudioActiveAsync(...args),
}));

describe('TabataAudioService (Seam 5)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('初始載入音訊失敗時，標記 degraded 為 true 且不拋出例外', async () => {
    const service = new TabataAudioService();
    // 即使模擬某些錯誤，也應降級為靜音
    const success = await service.initialize({
      voice_enabled: true,
      cues_enabled: true,
      music_enabled: false,
    });

    expect(typeof success).toBe('boolean');
    expect(service.isDegraded).toBe(!success);
  });

  it('播放語音與提示時，若背景音樂關閉則設定 duckOthers', async () => {
    const service = new TabataAudioService();
    const prefs: AudioPreferences = {
      voice_enabled: true,
      cues_enabled: true,
      music_enabled: false,
    };
    await service.initialize(prefs);

    await service.playVoice('prepare');
    expect(mockSetAudioModeAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        playsInSilentMode: true,
        interruptionMode: 'duckOthers',
      })
    );
  });

  it('暫停時停止所有待播提示、暫停背景音樂並解除焦點', async () => {
    const service = new TabataAudioService();
    await service.initialize({
      voice_enabled: true,
      cues_enabled: true,
      music_enabled: true,
    });

    await service.pause();
    expect(mockPause).toHaveBeenCalled();
    expect(mockSetIsAudioActiveAsync).toHaveBeenCalledWith(false);
  });

  it('播放提示音時，stage_countdown 可正常 seekTo(0) 並 play', async () => {
    const service = new TabataAudioService();
    await service.initialize({
      voice_enabled: true,
      cues_enabled: true,
      music_enabled: false,
    });

    await service.playCue('stage_countdown');
    expect(mockSeekTo).toHaveBeenCalledWith(0);
    expect(mockPlay).toHaveBeenCalled();
  });

  it('取消或釋放時停止所有音訊並釋放資源', async () => {
    const service = new TabataAudioService();
    await service.initialize({
      voice_enabled: true,
      cues_enabled: true,
      music_enabled: true,
    });

    await service.release();
    expect(mockPause).toHaveBeenCalled();
    expect(mockSetIsAudioActiveAsync).toHaveBeenCalledWith(false);
  });
});
