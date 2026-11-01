import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCoachStore } from '@/store/useCoachStore';
import { useTelemetryStore } from '@/store/useTelemetryStore';
import { useChatStore } from '@/store/useChatStore';
import { useMemoryStore } from '@/store/useMemoryStore';

/**
 * Service to purge user data with granular and complete wipe options.
 * Complies with local-first privacy requirements by deleting persisted
 * SQLite/AsyncStorage keys and resetting in-memory Zustand states.
 */
export async function clearAllUserData(): Promise<void> {
  try {
    // 1. Reset in-memory stores
    useCoachStore.getState().clearUserData();
    useTelemetryStore.getState().clearTelemetryData();
    useChatStore.getState().clearHistory();
    useMemoryStore.getState().clearMemories();

    // 2. Remove persisted keys from AsyncStorage
    await AsyncStorage.multiRemove([
      'zerocoach-coach-storage',
      'zerocoach-telemetry-storage',
      'zerocoach-chat-storage',
      'zerocoach-memory-storage',
    ]);
  } catch (error) {
    console.error('[UserDataService] Failed to clear all user data:', error);
  }
}

export async function clearChatHistoryOnly(): Promise<void> {
  try {
    useChatStore.getState().clearHistory();
    await AsyncStorage.removeItem('zerocoach-chat-storage');
  } catch (error) {
    console.error('[UserDataService] Failed to clear chat history:', error);
  }
}

export async function clearCoachMemoryOnly(): Promise<void> {
  try {
    useMemoryStore.getState().clearMemories();
    await AsyncStorage.removeItem('zerocoach-memory-storage');
  } catch (error) {
    console.error('[UserDataService] Failed to clear coach memory:', error);
  }
}

export async function clearBiometricsAndProgressionsOnly(): Promise<void> {
  try {
    useTelemetryStore.getState().clearTelemetryData();
    await AsyncStorage.removeItem('zerocoach-telemetry-storage');
  } catch (error) {
    console.error('[UserDataService] Failed to clear telemetry data:', error);
  }
}
