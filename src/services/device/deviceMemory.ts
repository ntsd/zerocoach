import * as Device from 'expo-device';
import { Platform } from 'react-native';

/**
 * Device memory utilities for intelligent LLM model selection.
 * Gemma 4 E2B (~3.11 GB GGUF) requires >= 6GB system RAM to run smoothly on mobile.
 * Qwen 3 1.7B (~1.05 GB GGUF) runs smoothly on budget/mid-range devices (< 6GB RAM).
 */

// 5.5 GB in bytes (accounts for OS kernel overhead reporting on 6GB RAM phones)
export const HIGH_MEMORY_THRESHOLD_BYTES = 5.5 * 1024 * 1024 * 1024;

export interface DeviceMemoryInfo {
  totalMemoryBytes: number | null;
  totalMemoryGb: number | null;
  isHighMemory: boolean;
  recommendedModelId: 'gemma-4-e2b-it-q4_k_m' | 'zerocoach-athletic-qwen3-1.7b-q4_k_m';
  deviceName: string | null;
}

export function getDeviceMemoryInfo(): DeviceMemoryInfo {
  let totalMemory: number | null = null;
  try {
    totalMemory = Device.totalMemory;
  } catch (err) {
    console.warn('[DeviceMemory] Failed to read Device.totalMemory:', err);
  }

  const deviceName = Device.modelName || Device.deviceName || Platform.OS;

  // Web or simulators without reported memory default to high-memory capacity
  if (!totalMemory || totalMemory <= 0) {
    return {
      totalMemoryBytes: null,
      totalMemoryGb: null,
      isHighMemory: true,
      recommendedModelId: 'gemma-4-e2b-it-q4_k_m',
      deviceName,
    };
  }

  const totalMemoryGb = Math.round((totalMemory / (1024 * 1024 * 1024)) * 10) / 10;
  const isHighMemory = totalMemory >= HIGH_MEMORY_THRESHOLD_BYTES;

  return {
    totalMemoryBytes: totalMemory,
    totalMemoryGb,
    isHighMemory,
    recommendedModelId: isHighMemory
      ? 'gemma-4-e2b-it-q4_k_m'
      : 'zerocoach-athletic-qwen3-1.7b-q4_k_m',
    deviceName,
  };
}
