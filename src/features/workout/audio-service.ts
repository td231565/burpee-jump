import {
  createAudioPlayer,
  setAudioModeAsync,
  setIsAudioActiveAsync,
  type AudioPlayer,
} from 'expo-audio';
import type { AudioPreferences } from '../../data/audio-preferences';
import type { SoundCueKey, VoicePromptKey } from './tabata';

const VOICE_ASSETS: Record<VoicePromptKey, any> = {
  prepare: require('../../../assets/audio/voice_prepare.wav'),
  work_first_start: require('../../../assets/audio/voice_work_first_start.wav'),
  work_start: require('../../../assets/audio/voice_work_start.wav'),
  rest: require('../../../assets/audio/voice_rest.wav'),
  completed: require('../../../assets/audio/voice_completed.wav'),
};

const CUE_ASSETS: Record<SoundCueKey, any> = {
  prepare_countdown: require('../../../assets/audio/cue_prepare_countdown.wav'),
  stage_countdown: require('../../../assets/audio/cue_stage_countdown.wav'),
  completion: require('../../../assets/audio/cue_completion.wav'),
};

const BGM_ASSET = require('../../../assets/audio/bgm_loop.wav');

// Expo 的啟用狀態是全域的，舊訓練必須完成停用才允許新訓練啟用。
let audioOperations = Promise.resolve();

function enqueueAudioOperation<T>(operation: () => Promise<T>): Promise<T> {
  const result = audioOperations.then(operation);
  audioOperations = result.then(() => {}, () => {});
  return result;
}

export class TabataAudioService {
  private preferences: AudioPreferences = {
    voice_enabled: true,
    cues_enabled: true,
    music_enabled: true,
  };

  private bgmPlayer: AudioPlayer | null = null;
  private voicePlayers: Partial<Record<VoicePromptKey, AudioPlayer>> = {};
  private cuePlayers: Partial<Record<SoundCueKey, AudioPlayer>> = {};
  private degraded = false;
  private initialized = false;
  private paused = false;
  private released = false;

  get isDegraded(): boolean {
    return this.degraded;
  }

  private get canPlay(): boolean {
    return this.initialized && !this.degraded && !this.paused && !this.released;
  }

  private get hasAudio(): boolean {
    return this.preferences.music_enabled || this.preferences.voice_enabled || this.preferences.cues_enabled;
  }

  initialize(preferences: AudioPreferences): Promise<boolean> {
    this.preferences = preferences;
    return enqueueAudioOperation(async () => {
      if (this.released) return false;
      if (!this.hasAudio) {
        this.initialized = true;
        return true;
      }
      try {
        await setAudioModeAsync({
          playsInSilentMode: true,
          interruptionMode: preferences.music_enabled ? 'doNotMix' : 'duckOthers',
        });
        if (this.released) return false;
        if (preferences.music_enabled) await setIsAudioActiveAsync(true);
        if (this.released) return false;

        if (preferences.music_enabled) {
          this.bgmPlayer = createAudioPlayer(BGM_ASSET);
          this.bgmPlayer.loop = true;
        }
        if (preferences.voice_enabled) {
          for (const [key, asset] of Object.entries(VOICE_ASSETS)) {
            this.voicePlayers[key as VoicePromptKey] = createAudioPlayer(asset);
          }
        }
        if (preferences.cues_enabled) {
          for (const [key, asset] of Object.entries(CUE_ASSETS)) {
            this.cuePlayers[key as SoundCueKey] = createAudioPlayer(asset);
          }
        }
        this.initialized = true;
        return true;
      } catch {
        this.degraded = true;
        this.initialized = false;
        return false;
      }
    });
  }

  playBgm(): Promise<void> {
    return enqueueAudioOperation(async () => {
      if (!this.canPlay || !this.preferences.music_enabled || !this.bgmPlayer) return;
      try {
        this.bgmPlayer.play();
      } catch {
        // 忽略播放錯誤
      }
    });
  }

  playVoice(key: VoicePromptKey): Promise<void> {
    if (!this.canPlay) return Promise.resolve();
    return enqueueAudioOperation(async () => {
      if (!this.canPlay || !this.preferences.voice_enabled) return;
      const player = this.voicePlayers[key];
      if (!player) return;
      try {
        if (!this.preferences.music_enabled) await setIsAudioActiveAsync(true);
        await player.seekTo(0);
        if (this.canPlay) player.play();
      } catch {
        // 忽略錯誤
      }
    });
  }

  playCue(key: SoundCueKey): Promise<void> {
    if (!this.canPlay) return Promise.resolve();
    return enqueueAudioOperation(async () => {
      if (!this.canPlay || !this.preferences.cues_enabled) return;
      const player = this.cuePlayers[key];
      if (!player) return;
      try {
        if (!this.preferences.music_enabled) await setIsAudioActiveAsync(true);
        await player.seekTo(0);
        if (this.canPlay) player.play();
      } catch {
        // 忽略錯誤
      }
    });
  }

  private pausePlayers(): void {
    this.bgmPlayer?.pause();
    for (const player of Object.values(this.voicePlayers)) player?.pause();
    for (const player of Object.values(this.cuePlayers)) player?.pause();
  }

  pause(): Promise<void> {
    this.paused = true;
    return enqueueAudioOperation(async () => {
      if (this.released) return;
      try {
        this.pausePlayers();
        await setIsAudioActiveAsync(false);
      } catch {
        // 忽略錯誤
      }
    });
  }

  resume(): Promise<void> {
    return enqueueAudioOperation(async () => {
      if (this.released || this.degraded || !this.hasAudio) return;
      try {
        if (this.preferences.music_enabled) await setIsAudioActiveAsync(true);
        this.paused = false;
        if (this.canPlay && this.preferences.music_enabled) this.bgmPlayer?.play();
      } catch {
        // 忽略錯誤
      }
    });
  }

  release(): Promise<void> {
    if (this.released) return audioOperations;
    this.released = true;
    this.initialized = false;
    return enqueueAudioOperation(async () => {
      try {
        this.pausePlayers();
        await setIsAudioActiveAsync(false);
      } catch {
        // 忽略錯誤
      } finally {
        const players = [this.bgmPlayer, ...Object.values(this.voicePlayers), ...Object.values(this.cuePlayers)];
        for (const player of players) {
          try {
            player?.remove();
          } catch {
            // 單一播放器釋放失敗仍繼續清理其餘資源
          }
        }
        this.bgmPlayer = null;
        this.voicePlayers = {};
        this.cuePlayers = {};
      }
    });
  }
}
