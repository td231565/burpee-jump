import { TabataAudioService } from '../src/features/workout/audio-service';
import type { AudioPreferences } from '../src/data/audio-preferences';
import { createAudioPlayer } from 'expo-audio';

// Mock expo-audio
const mockPlay = jest.fn();
const mockPause = jest.fn();
const mockSeekTo = jest.fn().mockResolvedValue(undefined);
const mockSetAudioModeAsync = jest.fn().mockResolvedValue(undefined);
const mockSetIsAudioActiveAsync = jest.fn().mockResolvedValue(undefined);
const mockRemove = jest.fn();

jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(() => ({
    loop: false,
    play: mockPlay,
    pause: mockPause,
    seekTo: mockSeekTo,
    addListener: jest.fn(() => ({ remove: jest.fn() })),
    remove: mockRemove,
  })),
  setAudioModeAsync: (...args: any[]) => mockSetAudioModeAsync(...args),
  setIsAudioActiveAsync: (...args: any[]) => mockSetIsAudioActiveAsync(...args),
}));

describe('TabataAudioService (Seam 5)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSetIsAudioActiveAsync.mockResolvedValue(undefined);
    mockSeekTo.mockResolvedValue(undefined);
  });

  it('初始載入音訊失敗時，標記 degraded 為 true 且不拋出例外', async () => {
    const service = new TabataAudioService();
    mockSetAudioModeAsync.mockRejectedValueOnce(new Error('audio unavailable'));
    const success = await service.initialize({
      voice_enabled: true,
      cues_enabled: true,
      music_enabled: false,
    });

    expect(success).toBe(false);
    expect(service.isDegraded).toBe(true);
  });

  it('播放語音與提示時，若背景音樂關閉則設定 duckOthers', async () => {
    const service = new TabataAudioService();
    const prefs: AudioPreferences = {
      voice_enabled: true,
      cues_enabled: true,
      music_enabled: false,
    };
    await service.initialize(prefs);
    expect(mockSetIsAudioActiveAsync).not.toHaveBeenCalledWith(true);

    await service.playVoice('prepare');
    expect(mockSetIsAudioActiveAsync).toHaveBeenCalledWith(true);
    expect(mockSetAudioModeAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        playsInSilentMode: true,
        interruptionMode: 'duckOthers',
      })
    );
  });

  it('第一組開始、後續運動開始與休息語音 key 均可播放', async () => {
    const service = new TabataAudioService();
    await service.initialize({
      voice_enabled: true,
      cues_enabled: false,
      music_enabled: false,
    });

    await service.playVoice('work_first_start');
    await service.playVoice('work_start');
    await service.playVoice('rest');

    expect(mockSeekTo).toHaveBeenCalledTimes(3);
    expect(mockPlay).toHaveBeenCalledTimes(3);
    await service.release();
  });

  it('提示語音關閉時不播放運動開始或休息語音', async () => {
    const service = new TabataAudioService();
    await service.initialize({
      voice_enabled: false,
      cues_enabled: false,
      music_enabled: false,
    });

    await service.playVoice('work_first_start');
    await service.playVoice('work_start');
    await service.playVoice('rest');

    expect(mockPlay).not.toHaveBeenCalled();
    await service.release();
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
    expect(mockRemove).toHaveBeenCalledTimes(9);
  });

  it('離開再進入訓練會重新啟用全域音訊並播放音樂', async () => {
    const prefs = { voice_enabled: true, cues_enabled: true, music_enabled: true };
    const first = new TabataAudioService();
    await first.initialize(prefs);
    await first.release();
    mockSetIsAudioActiveAsync.mockClear();
    mockPlay.mockClear();

    const next = new TabataAudioService();
    await next.initialize(prefs);
    await next.playBgm();

    expect(mockSetIsAudioActiveAsync).toHaveBeenCalledWith(true);
    expect(mockPlay).toHaveBeenCalledTimes(1);
    await next.release();
  });

  it.each([true, false])('暫停後繼續會啟用音訊，背景音樂開關為 %s', async (music) => {
    const service = new TabataAudioService();
    await service.initialize({ voice_enabled: true, cues_enabled: true, music_enabled: music });
    await service.pause();
    mockSetIsAudioActiveAsync.mockClear();
    mockPlay.mockClear();

    await service.resume();
    await service.playVoice('prepare');

    expect(mockSetIsAudioActiveAsync).toHaveBeenCalledWith(true);
    expect(mockPlay).toHaveBeenCalledTimes(music ? 2 : 1);
    await service.release();
  });

  it('舊服務停用尚未完成時，新服務等待清理後才初始化與播放', async () => {
    const prefs = { voice_enabled: true, cues_enabled: true, music_enabled: true };
    const old = new TabataAudioService();
    await old.initialize(prefs);
    let finishDeactivation!: () => void;
    let notifyStarted!: () => void;
    const started = new Promise<void>((resolve) => { notifyStarted = resolve; });
    mockSetIsAudioActiveAsync.mockImplementation((active: boolean) => {
      if (active) return Promise.resolve();
      notifyStarted();
      return new Promise<void>((resolve) => { finishDeactivation = resolve; });
    });
    const cleanup = old.release();
    await started;
    const next = new TabataAudioService();
    const initialization = next.initialize(prefs);
    try {
      await new Promise((resolve) => setImmediate(resolve));
      expect(createAudioPlayer).toHaveBeenCalledTimes(9);
    } finally {
      finishDeactivation();
      await cleanup;
      await initialization;
      mockSetIsAudioActiveAsync.mockResolvedValue(undefined);
      await next.release();
    }
  });

  it('初始化尚未完成就取消，不建立或播放遺留播放器', async () => {
    let finishMode!: () => void;
    mockSetAudioModeAsync.mockImplementationOnce(() => new Promise<void>((resolve) => {
      finishMode = resolve;
    }));
    const service = new TabataAudioService();
    const initialization = service.initialize({ voice_enabled: true, cues_enabled: true, music_enabled: true });
    await new Promise((resolve) => setImmediate(resolve));
    const cleanup = service.release();
    finishMode();
    await initialization;
    await cleanup;
    await service.playBgm();
    expect(createAudioPlayer).not.toHaveBeenCalled();
    expect(mockPlay).not.toHaveBeenCalled();
  });

  it('重複清理舊服務不會停用已開始的新訓練', async () => {
    const prefs = { voice_enabled: true, cues_enabled: true, music_enabled: true };
    const old = new TabataAudioService();
    await old.initialize(prefs);
    await old.release();
    const next = new TabataAudioService();
    await next.initialize(prefs);
    await next.playBgm();
    mockSetIsAudioActiveAsync.mockClear();
    mockRemove.mockClear();
    await old.release();
    expect(mockSetIsAudioActiveAsync).not.toHaveBeenCalled();
    expect(mockRemove).not.toHaveBeenCalled();
    await next.release();
  });

  it('語音 seek 尚未完成就暫停，不能在暫停後補播', async () => {
    const service = new TabataAudioService();
    await service.initialize({ voice_enabled: true, cues_enabled: true, music_enabled: false });
    let finishSeek!: () => void;
    mockSeekTo.mockImplementationOnce(() => new Promise<void>((resolve) => { finishSeek = resolve; }));
    const playback = service.playVoice('prepare');
    await new Promise((resolve) => setImmediate(resolve));
    const pause = service.pause();
    finishSeek();
    await playback;
    await pause;
    expect(mockPlay).not.toHaveBeenCalled();
    await service.release();
  });

  it('音訊偏好全關閉時不啟用 session 或取得焦點', async () => {
    const service = new TabataAudioService();
    await service.initialize({ voice_enabled: false, cues_enabled: false, music_enabled: false });
    await service.resume();
    expect(mockSetIsAudioActiveAsync).not.toHaveBeenCalledWith(true);
    expect(mockSetAudioModeAsync).not.toHaveBeenCalled();
    expect(createAudioPlayer).not.toHaveBeenCalled();
    await service.release();
  });
});
