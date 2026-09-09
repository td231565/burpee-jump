import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  AppState,
  type AppStateStatus,
} from 'react-native';
import {
  useAudioPlayer,
  useAudioPlayerStatus,
  setAudioModeAsync,
  setIsAudioActiveAsync,
} from 'expo-audio';

const loopAsset = require('../../assets/test-audio/test-loop.wav');
const cueAsset = require('../../assets/test-audio/test-cue.wav');

export default function AudioTestScreen() {
  const [logs, setLogs] = useState<string[]>([]);
  const [activeMode, setActiveMode] = useState<string>('未初始化');
  const [isDuckRunning, setIsDuckRunning] = useState<boolean>(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const appendLog = useCallback((message: string) => {
    const time = new Date().toTimeString().split(' ')[0];
    setLogs((prev) => [`[${time}] ${message}`, ...prev.slice(0, 49)]);
  }, []);

  const loopPlayer = useAudioPlayer(loopAsset, { updateInterval: 250 });
  const loopStatus = useAudioPlayerStatus(loopPlayer);
  const loopPlayerRef = useRef(loopPlayer);

  const cuePlayer = useAudioPlayer(cueAsset, { updateInterval: 100 });
  const cueStatus = useAudioPlayerStatus(cuePlayer);
  const cuePlayerRef = useRef(cuePlayer);

  useEffect(() => {
    loopPlayerRef.current = loopPlayer;
    cuePlayerRef.current = cuePlayer;
  });

  // Enable loop on loopPlayer
  useEffect(() => {
    const player = loopPlayerRef.current;
    player.loop = true;
  }, []);

  // Monitor cue playback completion via event listener to release ducking
  useEffect(() => {
    const player = cuePlayerRef.current;
    const sub = player.addListener('playbackStatusUpdate', async (status) => {
      if (status.didJustFinish) {
        setIsDuckRunning(false);
        appendLog('短提示播放完畢，準備釋放焦點 (setIsAudioActiveAsync: false)');
        try {
          await setIsAudioActiveAsync(false);
          appendLog('已釋放焦點，第三方音樂音量應已恢復');
        } catch (err: unknown) {
          appendLog(`釋放焦點失敗: ${String(err)}`);
        }
      }
    });

    return () => {
      sub.remove();
    };
  }, [appendLog]);

  // AppState listener for contract: background/inactive auto-pause and release focus
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
      const prev = appStateRef.current;
      appStateRef.current = nextAppState;
      appendLog(`AppState 狀態變更: ${prev} -> ${nextAppState}`);

      if (nextAppState === 'background' || nextAppState === 'inactive') {
        try {
          loopPlayer.pause();
          cuePlayer.pause();
          await setIsAudioActiveAsync(false);
          appendLog('已進入背景/失去焦點：已自動暫停所有音訊並釋放音訊焦點');
        } catch (err) {
          appendLog(`背景自動暫停處理失敗: ${String(err)}`);
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [loopPlayer, cuePlayer, appendLog]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      try {
        loopPlayer.pause();
        cuePlayer.pause();
        setIsAudioActiveAsync(false).catch(() => {});
      } catch {
        // ignore
      }
    };
  }, [loopPlayer, cuePlayer]);

  // Action: Play BGM with doNotMix
  const handlePlayBgmDoNotMix = async () => {
    try {
      appendLog('設定音訊模式: doNotMix + playsInSilentMode: true');
      await setAudioModeAsync({
        playsInSilentMode: true,
        interruptionMode: 'doNotMix',
      });
      setActiveMode('doNotMix');
      loopPlayerRef.current.loop = true;
      loopPlayerRef.current.play();
      appendLog('BGM (doNotMix) 開始播放，第三方音樂應已被系統暫停');
    } catch (err) {
      appendLog(`播放 BGM 失敗: ${String(err)}`);
    }
  };

  // Action: Pause BGM
  const handlePauseBgm = () => {
    try {
      loopPlayer.pause();
      appendLog('BGM 已手動暫停');
    } catch (err) {
      appendLog(`暫停失敗: ${String(err)}`);
    }
  };

  // Action: Stop BGM & Release Focus
  const handleStopBgmAndRelease = async () => {
    try {
      loopPlayer.pause();
      await loopPlayer.seekTo(0);
      await setIsAudioActiveAsync(false);
      setActiveMode('已釋放焦點');
      appendLog('BGM 已停止並重設，焦點已釋放（系統與第三方 App 決定是否續播）');
    } catch (err) {
      appendLog(`停止釋放失敗: ${String(err)}`);
    }
  };

  // Action: Play short cue with duckOthers
  const handlePlayCueDuckOthers = async () => {
    try {
      setIsDuckRunning(true);
      appendLog('設定音訊模式: duckOthers + playsInSilentMode: true');
      await setAudioModeAsync({
        playsInSilentMode: true,
        interruptionMode: 'duckOthers',
      });
      setActiveMode('duckOthers');
      await cuePlayer.seekTo(0);
      cuePlayer.play();
      appendLog('短提示 (duckOthers) 播放中，第三方音樂音量應瞬間降低');
    } catch (err) {
      setIsDuckRunning(false);
      appendLog(`播放短提示失敗: ${String(err)}`);
    }
  };

  // Action: Simulate cancel / exit
  const handleSimulateCancelExit = async () => {
    try {
      loopPlayer.pause();
      cuePlayer.pause();
      await setIsAudioActiveAsync(false);
      setActiveMode('已離開/釋放');
      appendLog('模擬取消/離開：已停止所有音訊並釋放焦點');
    } catch (err) {
      appendLog(`離開處理失敗: ${String(err)}`);
    }
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>MVP 音訊技術驗證</Text>
      <Text style={styles.subtitle}>Phase 1.5 實機平台契約測試</Text>

      {/* Contract 1 & 2: BGM with doNotMix */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>契約 1 & 2：本機循環與 doNotMix</Text>
        <Text style={styles.instruction}>
          測試步驟：{'\n'}
          1. 先在第三方 App (Spotify/Apple Music) 播放音樂{'\n'}
          2. 點擊「以 doNotMix 播放 BGM」，確認第三方音樂是否被系統暫停{'\n'}
          3. 觀察 BGM 是否正常播放並自動循環{'\n'}
          4. 點擊「停止並釋放焦點」，確認焦點釋放
        </Text>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>狀態：</Text>
          <Text style={styles.statusValue}>
            {loopStatus.playing ? '▶ 播放中' : '⏸ 暫停/停止'} | 循環: {loopPlayer.loop ? '開' : '關'} | 進度: {loopStatus.currentTime.toFixed(1)}s / {loopStatus.duration.toFixed(1)}s
          </Text>
        </View>
        <View style={styles.buttonRow}>
          <Pressable style={[styles.button, styles.primaryButton]} onPress={handlePlayBgmDoNotMix}>
            <Text style={styles.primaryButtonText}>播放 BGM (doNotMix)</Text>
          </Pressable>
          <Pressable style={[styles.button, styles.secondaryButton]} onPress={handlePauseBgm}>
            <Text style={styles.buttonText}>暫停</Text>
          </Pressable>
          <Pressable style={[styles.button, styles.dangerButton]} onPress={handleStopBgmAndRelease}>
            <Text style={styles.buttonText}>停止並釋放</Text>
          </Pressable>
        </View>
      </View>

      {/* Contract 3: Cue with duckOthers */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>契約 3：短語音／提示 duckOthers 恢復</Text>
        <Text style={styles.instruction}>
          測試步驟：{'\n'}
          1. 保持第三方音樂 (Spotify/Apple Music) 播放中{'\n'}
          2. 點擊「播放短提示 (duckOthers)」{'\n'}
          3. 確認第三方音樂音量短暫變小（Duck）{'\n'}
          4. 提示音播畢後確認第三方音樂音量立即恢復
        </Text>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>狀態：</Text>
          <Text style={styles.statusValue}>
            {cueStatus.playing ? '▶ 提示音播放中' : '⏹ 閒置'} | 剩餘: {(cueStatus.duration - cueStatus.currentTime).toFixed(1)}s
          </Text>
        </View>
        <Pressable
          style={[styles.button, styles.accentButton, isDuckRunning && styles.disabledButton]}
          disabled={isDuckRunning}
          onPress={handlePlayCueDuckOthers}
        >
          <Text style={styles.primaryButtonText}>
            {isDuckRunning ? '播放與 Ducking 中...' : '播放短提示 (duckOthers)'}
          </Text>
        </Pressable>
      </View>

      {/* Contract 4 & 5: Background pause & Silent mode */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>契約 4 & 5：生命週期暫停與靜音模式</Text>
        <Text style={styles.instruction}>
          測試步驟：{'\n'}
          - 背景測試：播放 BGM 時切回桌面或鎖定螢幕，確認聲音立即停止且釋放焦點{'\n'}
          - 取消離開：點擊「模擬取消／離開」，確認停止播放並釋放焦點{'\n'}
          - 靜音模式：iPhone 開啟實體靜音開關（或 Android 設為靜音/震動），點擊播放確認仍可發聲
        </Text>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>目前模式：</Text>
          <Text style={styles.statusValue}>{activeMode} (playsInSilentMode: true)</Text>
        </View>
        <Pressable style={[styles.button, styles.secondaryButton]} onPress={handleSimulateCancelExit}>
          <Text style={styles.buttonText}>模擬取消／離開 (釋放焦點)</Text>
        </Pressable>
      </View>

      {/* Real-time Event Log */}
      <View style={styles.card}>
        <View style={styles.logHeader}>
          <Text style={styles.cardTitle}>即時事件日誌</Text>
          <Pressable onPress={handleClearLogs}>
            <Text style={styles.clearText}>清除</Text>
          </Pressable>
        </View>
        <View style={styles.logBox}>
          {logs.length === 0 ? (
            <Text style={styles.emptyLogText}>尚無操作記錄，請點擊上方按鈕測試</Text>
          ) : (
            logs.map((log, idx) => (
              <Text key={idx} style={styles.logItem}>
                {log}
              </Text>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A2130',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  instruction: {
    fontSize: 13,
    lineHeight: 18,
    color: '#4B5563',
    marginBottom: 12,
    backgroundColor: '#F9FAFB',
    padding: 10,
    borderRadius: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  statusValue: {
    fontSize: 13,
    color: '#2563EB',
    flexShrink: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#2563EB',
    flex: 2,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#E5E7EB',
    flex: 1,
  },
  dangerButton: {
    backgroundColor: '#FEE2E2',
    flex: 1.5,
  },
  accentButton: {
    backgroundColor: '#059669',
    width: '100%',
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  clearText: {
    fontSize: 13,
    color: '#2563EB',
    fontWeight: '600',
  },
  logBox: {
    backgroundColor: '#111827',
    borderRadius: 10,
    padding: 12,
    minHeight: 120,
    maxHeight: 240,
  },
  emptyLogText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontStyle: 'italic',
  },
  logItem: {
    color: '#10B981',
    fontSize: 11,
    fontFamily: 'Courier',
    marginBottom: 4,
  },
});
