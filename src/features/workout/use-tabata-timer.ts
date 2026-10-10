import { useCallback, useEffect, useReducer, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import type { AudioPreferences } from '../../data/audio-preferences';
import { formatLocalDateKey } from '../calendar/date-utils';
import { TabataAudioService } from './audio-service';
import {
  createTabataPlan,
  DEFAULT_WORKOUT_PARAMETERS,
  deriveTabataSnapshot,
  getTabataEvents,
  type TabataSnapshot,
  type TabataPlan,
  type WorkoutParameters,
} from './tabata';

export type WorkoutStatus =
  | 'ready'
  | 'preparing'
  | 'running'
  | 'paused'
  | 'saving'
  | 'saveError'
  | 'completed'
  | 'cancelled';

export interface SaveRecord {
  localDate: string;
  completedAt: string;
}

interface WorkoutState {
  status: WorkoutStatus;
  lockedLocalDate: string | null;
  plan: TabataPlan;
  snapshot: TabataSnapshot;
  isAudioDegraded: boolean;
  saveRecord: SaveRecord | null;
  recordCompletion: boolean;
}

type WorkoutAction =
  | { type: 'START'; localDate: string; plan: TabataPlan }
  | { type: 'TICK'; snapshot: TabataSnapshot; status?: WorkoutStatus }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'FINISH'; completedAt: string }
  | { type: 'SAVE_SUCCESS' }
  | { type: 'SAVE_ERROR' }
  | { type: 'RETRY_SAVE' }
  | { type: 'DISCARD' }
  | { type: 'CANCEL' }
  | { type: 'SET_AUDIO_DEGRADED'; degraded: boolean };

const initialSnapshot = deriveTabataSnapshot(0);

const initialState: WorkoutState = {
  status: 'ready',
  lockedLocalDate: null,
  plan: createTabataPlan(DEFAULT_WORKOUT_PARAMETERS),
  snapshot: initialSnapshot,
  isAudioDegraded: false,
  saveRecord: null,
  recordCompletion: true,
};

function workoutReducer(state: WorkoutState, action: WorkoutAction): WorkoutState {
  switch (action.type) {
    case 'START':
      return {
        ...state,
        status: 'preparing',
        lockedLocalDate: action.localDate,
        plan: action.plan,
        saveRecord: null,
        snapshot: deriveTabataSnapshot(0, action.plan),
      };
    case 'TICK':
      return {
        ...state,
        snapshot: action.snapshot,
        status: action.status ?? state.status,
      };
    case 'PAUSE':
      if (state.status !== 'preparing' && state.status !== 'running') return state;
      return {
        ...state,
        status: 'paused',
      };
    case 'RESUME':
      if (state.status !== 'paused') return state;
      return {
        ...state,
        status: state.snapshot.phase === 'preparing' ? 'preparing' : 'running',
      };
    case 'FINISH':
      if (!state.recordCompletion) {
        return {
          ...state,
          status: 'completed',
          saveRecord: null,
          snapshot: deriveTabataSnapshot(state.plan.totalFlowDurationMs, state.plan),
        };
      }
      return {
        ...state,
        status: 'saving',
        saveRecord: state.lockedLocalDate
          ? { localDate: state.lockedLocalDate, completedAt: action.completedAt }
          : null,
        snapshot: deriveTabataSnapshot(state.plan.totalFlowDurationMs, state.plan),
      };
    case 'SAVE_SUCCESS':
      return {
        ...state,
        status: 'completed',
      };
    case 'SAVE_ERROR':
      return {
        ...state,
        status: 'saveError',
      };
    case 'RETRY_SAVE':
      if (state.status !== 'saveError') return state;
      return {
        ...state,
        status: 'saving',
      };
    case 'DISCARD':
    case 'CANCEL':
      return {
        ...state,
        status: 'cancelled',
        saveRecord: null,
      };
    case 'SET_AUDIO_DEGRADED':
      return {
        ...state,
        isAudioDegraded: action.degraded,
      };
    default:
      return state;
  }
}

export interface UseTabataTimerProps {
  preferences: AudioPreferences | null;
  recordCompletion?: boolean;
}

export function useTabataTimer({ preferences, recordCompletion = true }: UseTabataTimerProps) {
  const [state, dispatch] = useReducer(workoutReducer, {
    ...initialState,
    recordCompletion,
  });

  const accumulatedElapsedRef = useRef(0);
  const sessionStartTimeRef = useRef<number | null>(null);
  const lastEvaluatedMsRef = useRef(0);
  const audioServiceRef = useRef<TabataAudioService | null>(null);
  const statusRef = useRef(state.status);

  useEffect(() => {
    statusRef.current = state.status;
  }, [state.status]);

  // Initialize audio service
  useEffect(() => {
    if (!preferences || statusRef.current === 'cancelled') return;
    let active = true;
    const audioService = new TabataAudioService();
    audioServiceRef.current = audioService;

    audioService.initialize(preferences).then((success) => {
      if (!active || statusRef.current === 'cancelled') return;
      if (!success) {
        dispatch({ type: 'SET_AUDIO_DEGRADED', degraded: true });
      } else if (statusRef.current === 'paused') {
        audioService.pause();
      } else if (preferences.music_enabled) {
        audioService.playBgm();
      }
    });

    return () => {
      active = false;
      audioServiceRef.current = null;
      audioService.release();
    };
  }, [preferences]);

  useEffect(() => () => { deactivateKeepAwake(); }, []);

  // KeepAwake sync
  useEffect(() => {
    if (state.status === 'preparing' || state.status === 'running') {
      activateKeepAwakeAsync();
    } else {
      deactivateKeepAwake();
    }
  }, [state.status]);

  // AppState auto pause
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        if (statusRef.current === 'preparing' || statusRef.current === 'running') {
          // Pause timer & audio
          if (sessionStartTimeRef.current !== null) {
            accumulatedElapsedRef.current += Date.now() - sessionStartTimeRef.current;
            sessionStartTimeRef.current = null;
          }
          dispatch({ type: 'PAUSE' });
          audioServiceRef.current?.pause();
        } else if (statusRef.current === 'saveError') {
          audioServiceRef.current?.pause();
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Timer loop
  useEffect(() => {
    const isRunning = state.status === 'preparing' || state.status === 'running';
    if (!isRunning) return;

    if (sessionStartTimeRef.current === null) {
      sessionStartTimeRef.current = Date.now();
    }

    const elapsedAtResume = accumulatedElapsedRef.current + Date.now() - sessionStartTimeRef.current;
    // Start prompts finish at the stage boundary, independently of the 100ms display tick.
    const startVoiceTimeouts = state.plan.voiceSchedule
      .filter(({ event, timeMs }) =>
        (event === 'work_first_start' || event === 'work_start') && timeMs > elapsedAtResume
      )
      .map(({ event, timeMs }) => setTimeout(() => {
        audioServiceRef.current?.playVoice(event);
      }, Math.ceil(timeMs - elapsedAtResume)));

    const intervalId = setInterval(() => {
      if (sessionStartTimeRef.current === null) return;

      const currentSessionElapsed = Date.now() - sessionStartTimeRef.current;
      const totalElapsedMs = accumulatedElapsedRef.current + currentSessionElapsed;

      // 音訊事件推導
      const fromMs = lastEvaluatedMsRef.current;
      const toMs = Math.min(totalElapsedMs, state.plan.totalFlowDurationMs);
      lastEvaluatedMsRef.current = toMs;

      const { voices, cues } = getTabataEvents(fromMs, toMs, state.plan);
      const audio = audioServiceRef.current;
      if (audio) {
        for (const v of voices) {
          if (v !== 'work_first_start' && v !== 'work_start') audio.playVoice(v);
        }
        for (const c of cues) audio.playCue(c);
      }

      const snapshot = deriveTabataSnapshot(totalElapsedMs, state.plan);

      if (snapshot.isFinished) {
        accumulatedElapsedRef.current = state.plan.totalFlowDurationMs;
        sessionStartTimeRef.current = null;
        const completedAt = new Date().toISOString();
        dispatch({ type: 'FINISH', completedAt });
        clearInterval(intervalId);
        return;
      }

      const nextStatus = snapshot.phase === 'preparing' ? 'preparing' : 'running';
      dispatch({ type: 'TICK', snapshot, status: nextStatus });
    }, 100);

    return () => {
      clearInterval(intervalId);
      startVoiceTimeouts.forEach(clearTimeout);
    };
  }, [state.status, state.plan]);

  const start = useCallback((parameters: WorkoutParameters = DEFAULT_WORKOUT_PARAMETERS) => {
    const plan = createTabataPlan(parameters);
    const today = new Date();
    const localDate = formatLocalDateKey(today);
    accumulatedElapsedRef.current = 0;
    sessionStartTimeRef.current = Date.now();
    lastEvaluatedMsRef.current = 0;

    dispatch({ type: 'START', localDate, plan });
    audioServiceRef.current?.playVoice('prepare');
    audioServiceRef.current?.playCue('prepare_countdown');
    // The initial events were emitted directly above; subsequent event windows start after t=0.
    lastEvaluatedMsRef.current = 1;
  }, []);

  const pause = useCallback(() => {
    if (sessionStartTimeRef.current !== null) {
      accumulatedElapsedRef.current += Date.now() - sessionStartTimeRef.current;
      sessionStartTimeRef.current = null;
    }
    dispatch({ type: 'PAUSE' });
    audioServiceRef.current?.pause();
  }, []);

  const resume = useCallback(() => {
    sessionStartTimeRef.current = Date.now();
    dispatch({ type: 'RESUME' });
    audioServiceRef.current?.resume();
  }, []);

  const cancel = useCallback(() => {
    sessionStartTimeRef.current = null;
    dispatch({ type: 'CANCEL' });
    audioServiceRef.current?.release();
  }, []);

  const markSaveSuccess = useCallback(() => {
    dispatch({ type: 'SAVE_SUCCESS' });
  }, []);

  const markSaveError = useCallback(() => {
    dispatch({ type: 'SAVE_ERROR' });
  }, []);

  const retrySave = useCallback(() => {
    dispatch({ type: 'RETRY_SAVE' });
  }, []);

  const discardSave = useCallback(() => {
    sessionStartTimeRef.current = null;
    dispatch({ type: 'DISCARD' });
    audioServiceRef.current?.release();
  }, []);

  return {
    status: state.status,
    lockedLocalDate: state.lockedLocalDate,
    snapshot: state.snapshot,
    isAudioDegraded: state.isAudioDegraded,
    saveRecord: state.saveRecord,
    start,
    pause,
    resume,
    cancel,
    markSaveSuccess,
    markSaveError,
    retrySave,
    discardSave,
  };
}
