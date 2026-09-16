import { useCallback, useEffect, useReducer, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import type { AudioPreferences } from '../../data/audio-preferences';
import { formatLocalDateKey } from '../calendar/date-utils';
import { TabataAudioService } from './audio-service';
import {
  deriveTabataSnapshot,
  getTabataEvents,
  TOTAL_FLOW_DURATION_MS,
  type TabataSnapshot,
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
  snapshot: TabataSnapshot;
  isAudioDegraded: boolean;
  saveRecord: SaveRecord | null;
  recordCompletion: boolean;
}

type WorkoutAction =
  | { type: 'START'; localDate: string }
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
        saveRecord: null,
        snapshot: deriveTabataSnapshot(0),
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
          snapshot: deriveTabataSnapshot(TOTAL_FLOW_DURATION_MS),
        };
      }
      return {
        ...state,
        status: 'saving',
        saveRecord: state.lockedLocalDate
          ? { localDate: state.lockedLocalDate, completedAt: action.completedAt }
          : null,
        snapshot: deriveTabataSnapshot(TOTAL_FLOW_DURATION_MS),
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
  preferences: AudioPreferences;
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
    const audioService = new TabataAudioService();
    audioServiceRef.current = audioService;

    audioService.initialize(preferences).then((success) => {
      if (!success) {
        dispatch({ type: 'SET_AUDIO_DEGRADED', degraded: true });
      } else if (preferences.music_enabled) {
        audioService.playBgm();
      }
    });

    return () => {
      audioService.release();
      deactivateKeepAwake();
    };
  }, [preferences]);

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

    const intervalId = setInterval(() => {
      if (sessionStartTimeRef.current === null) return;

      const currentSessionElapsed = Date.now() - sessionStartTimeRef.current;
      const totalElapsedMs = accumulatedElapsedRef.current + currentSessionElapsed;

      // 音訊事件推導
      const fromMs = lastEvaluatedMsRef.current;
      const toMs = Math.min(totalElapsedMs, TOTAL_FLOW_DURATION_MS);
      lastEvaluatedMsRef.current = toMs;

      const { voices, cues } = getTabataEvents(fromMs, toMs);
      const audio = audioServiceRef.current;
      if (audio) {
        for (const v of voices) audio.playVoice(v);
        for (const c of cues) audio.playCue(c);
      }

      const snapshot = deriveTabataSnapshot(totalElapsedMs);

      if (snapshot.isFinished) {
        accumulatedElapsedRef.current = TOTAL_FLOW_DURATION_MS;
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
    };
  }, [state.status]);

  const start = useCallback(() => {
    const today = new Date();
    const localDate = formatLocalDateKey(today);
    accumulatedElapsedRef.current = 0;
    sessionStartTimeRef.current = Date.now();
    lastEvaluatedMsRef.current = 0;

    dispatch({ type: 'START', localDate });
    audioServiceRef.current?.playVoice('prepare');
    audioServiceRef.current?.playCue('prepare_countdown');
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
