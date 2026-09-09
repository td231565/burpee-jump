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
  work_1: require('../../../assets/audio/voice_work_1.wav'),
  rest_1: require('../../../assets/audio/voice_rest_1.wav'),
  work_2: require('../../../assets/audio/voice_work_2.wav'),
  rest_2: require('../../../assets/audio/voice_rest_2.wav'),
  work_3: require('../../../assets/audio/voice_work_3.wav'),
  rest_3: require('../../../assets/audio/voice_rest_3.wav'),
  work_4: require('../../../assets/audio/voice_work_4.wav'),
  completed: require('../../../assets/audio/voice_completed.wav'),
};

const CUE_ASSETS: Record<SoundCueKey, any> = {
  prepare_countdown: require('../../../assets/audio/cue_prepare_countdown.wav'),
  warning_5s: require('../../../assets/audio/cue_warning_5s.wav'),
  countdown: require('../../../assets/audio/cue_countdown.wav'),
  completion: require('../../../assets/audio/cue_completion.wav'),
};

const BGM_ASSET = require('../../../assets/audio/bgm_loop.wav');

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

  get isDegraded(): boolean {
    return this.degraded;
  }

  async initialize(preferences: AudioPreferences): Promise<boolean> {
    this.preferences = preferences;
    try {
      if (preferences.music_enabled) {
        await setAudioModeAsync({
          playsInSilentMode: true,
          interruptionMode: 'doNotMix',
        });
        const player = createAudioPlayer(BGM_ASSET);
        player.loop = true;
        this.bgmPlayer = player;
      } else {
        await setAudioModeAsync({
          playsInSilentMode: true,
          interruptionMode: 'duckOthers',
        });
      }

      if (preferences.voice_enabled) {
        for (const [key, asset] of Object.entries(VOICE_ASSETS)) {
          const player = createAudioPlayer(asset);
          this.voicePlayers[key as VoicePromptKey] = player;
        }
      }

      if (preferences.cues_enabled) {
        for (const [key, asset] of Object.entries(CUE_ASSETS)) {
          const player = createAudioPlayer(asset);
          this.cuePlayers[key as SoundCueKey] = player;
        }
      }

      this.initialized = true;
      return true;
    } catch {
      this.degraded = true;
      this.initialized = false;
      return false;
    }
  }

  async playBgm(): Promise<void> {
    if (this.degraded || !this.preferences.music_enabled || !this.bgmPlayer) return;
    try {
      this.bgmPlayer.play();
    } catch {
      // 忽略播放錯誤
    }
  }

  async playVoice(key: VoicePromptKey): Promise<void> {
    if (this.degraded || !this.preferences.voice_enabled) return;
    const player = this.voicePlayers[key];
    if (!player) return;

    try {
      if (!this.preferences.music_enabled) {
        await setAudioModeAsync({
          playsInSilentMode: true,
          interruptionMode: 'duckOthers',
        });
      }
      await player.seekTo(0);
      player.play();
    } catch {
      // 忽略錯誤
    }
  }

  async playCue(key: SoundCueKey): Promise<void> {
    if (this.degraded || !this.preferences.cues_enabled) return;
    const player = this.cuePlayers[key];
    if (!player) return;

    try {
      if (!this.preferences.music_enabled) {
        await setAudioModeAsync({
          playsInSilentMode: true,
          interruptionMode: 'duckOthers',
        });
      }
      await player.seekTo(0);
      player.play();
    } catch {
      // 忽略錯誤
    }
  }

  async pause(): Promise<void> {
    try {
      if (this.bgmPlayer) {
        this.bgmPlayer.pause();
      }
      for (const p of Object.values(this.voicePlayers)) {
        p?.pause();
      }
      for (const p of Object.values(this.cuePlayers)) {
        p?.pause();
      }
      await setIsAudioActiveAsync(false);
    } catch {
      // 忽略錯誤
    }
  }

  async resume(): Promise<void> {
    try {
      if (this.preferences.music_enabled && this.bgmPlayer) {
        await setAudioModeAsync({
          playsInSilentMode: true,
          interruptionMode: 'doNotMix',
        });
        this.bgmPlayer.play();
      }
    } catch {
      // 忽略錯誤
    }
  }

  async release(): Promise<void> {
    await this.pause();
    this.bgmPlayer = null;
    this.voicePlayers = {};
    this.cuePlayers = {};
  }
}
