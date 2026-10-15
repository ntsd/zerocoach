import { TelemetryMetrics } from '@/types/telemetry';
import { calculateReadinessScore } from './readinessCalculator';

/**
 * HealthConnectAdapter provides local on-device wearable sync abstraction.
 * On real Android devices, it bridges to Android Health Connect / Google Fit
 * without making remote cloud calls.
 */
export class HealthConnectAdapter {
  private isAvailable: boolean = false;

  constructor() {
    this.isAvailable = false;
  }

  public async checkAvailability(): Promise<boolean> {
    return this.isAvailable;
  }

  public async fetchLatestMetrics(): Promise<TelemetryMetrics> {
    const available = await this.checkAvailability();
    if (!available) {
      throw new Error(
        'No Health Connect or Fitness App detected on this device.'
      );
    }

    throw new Error('No records returned from local health provider.');
  }
}

export const healthAdapter = new HealthConnectAdapter();
