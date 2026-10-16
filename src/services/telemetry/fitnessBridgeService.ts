import { Platform, Linking } from 'react-native';
import { TelemetryMetrics, TelemetrySource } from '@/types/telemetry';
import { calculateReadinessScore } from './readinessCalculator';

export interface HealthAvailabilityStatus {
  available: boolean;
  provider: 'health_connect' | 'apple_health' | 'simulation';
  requiresInstall?: boolean;
  requiresPermissions?: boolean;
  message: string;
}

// Safely obtain native modules if available on physical device builds
let HealthConnectModule: any = null;
let AppleHealthKitModule: any = null;

if (Platform.OS === 'android') {
  try {
    HealthConnectModule = require('react-native-health-connect');
  } catch (err) {
    console.log('[FitnessBridge] react-native-health-connect native module not loaded:', err);
  }
} else if (Platform.OS === 'ios') {
  try {
    AppleHealthKitModule = require('react-native-health').default;
  } catch (err) {
    console.log('[FitnessBridge] react-native-health native module not loaded:', err);
  }
}

export class FitnessBridgeService {
  /**
   * Check if native health provider (Health Connect or HealthKit) is available
   */
  public async checkAvailability(): Promise<HealthAvailabilityStatus> {
    if (Platform.OS === 'web') {
      return {
        available: false,
        provider: 'simulation',
        message: 'Running in Web environment. Using simulated wearable device bridge.',
      };
    }

    if (Platform.OS === 'android') {
      if (!HealthConnectModule) {
        return {
          available: false,
          provider: 'simulation',
          message: 'Health Connect native module not linked. Running in Expo Go / Dev client.',
        };
      }

      try {
        const initialized = await HealthConnectModule.initialize();
        if (!initialized) {
          return {
            available: false,
            provider: 'health_connect',
            requiresInstall: true,
            message: 'Health Connect is not initialized on this device.',
          };
        }

        const status = await HealthConnectModule.getSdkStatus();
        // 1 = SDK_UNAVAILABLE, 2 = SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED, 3 = SDK_AVAILABLE
        if (status === 3 || status === HealthConnectModule.SdkAvailabilityStatus?.SDK_AVAILABLE) {
          let hasPermissions = false;
          try {
            const granted = await HealthConnectModule.getGrantedPermissions();
            hasPermissions = Array.isArray(granted) && granted.length > 0;
          } catch {}

          return {
            available: true,
            provider: 'health_connect',
            requiresPermissions: !hasPermissions,
            message: hasPermissions
              ? 'Android Health Connect ready (aggregates Garmin, Samsung, Google Fit, Whoop, Oura).'
              : 'Android Health Connect available. Permissions required to read biometrics.',
          };
        } else if (
          status === 2 ||
          status === HealthConnectModule.SdkAvailabilityStatus?.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED
        ) {
          return {
            available: false,
            provider: 'health_connect',
            requiresInstall: true,
            message: 'Health Connect app update or installation required from Google Play Store.',
          };
        }

        return {
          available: false,
          provider: 'health_connect',
          message: 'Health Connect is unavailable on this hardware.',
        };
      } catch (err: any) {
        return {
          available: false,
          provider: 'simulation',
          message: err?.message || 'Failed to initialize Health Connect.',
        };
      }
    }

    if (Platform.OS === 'ios') {
      if (!AppleHealthKitModule) {
        return {
          available: false,
          provider: 'simulation',
          message: 'Apple HealthKit native module not linked. Running in Expo Go / Simulator.',
        };
      }

      return new Promise((resolve) => {
        AppleHealthKitModule.isAvailable((err: any, available: boolean) => {
          if (err || !available) {
            resolve({
              available: false,
              provider: 'apple_health',
              message: 'Apple Health is not available on this device.',
            });
          } else {
            resolve({
              available: true,
              provider: 'apple_health',
              message: 'Apple HealthKit ready (aggregates Apple Watch, Garmin, Whoop, Oura).',
            });
          }
        });
      });
    }

    return {
      available: false,
      provider: 'simulation',
      message: 'Platform not supported for native health.',
    };
  }

  /**
   * Request user authorization for fitness metrics
   */
  public async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'android' && HealthConnectModule) {
      try {
        await HealthConnectModule.initialize();
        const granted = await HealthConnectModule.requestPermission([
          { accessType: 'read', recordType: 'Steps' },
          { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
          { accessType: 'read', recordType: 'HeartRate' },
          { accessType: 'read', recordType: 'RestingHeartRate' },
          { accessType: 'read', recordType: 'HeartRateVariabilityRmssd' },
          { accessType: 'read', recordType: 'SleepSession' },
          { accessType: 'read', recordType: 'Weight' },
          { accessType: 'read', recordType: 'Height' },
        ]);
        return granted && granted.length > 0;
      } catch (err) {
        console.warn('[FitnessBridge] Health Connect permission request error:', err);
        return false;
      }
    }

    if (Platform.OS === 'ios' && AppleHealthKitModule) {
      return new Promise((resolve) => {
        const permissions = {
          permissions: {
            read: [
              AppleHealthKitModule.Constants.Permissions.StepCount,
              AppleHealthKitModule.Constants.Permissions.ActiveEnergyBurned,
              AppleHealthKitModule.Constants.Permissions.HeartRate,
              AppleHealthKitModule.Constants.Permissions.RestingHeartRate,
              AppleHealthKitModule.Constants.Permissions.HeartRateVariability,
              AppleHealthKitModule.Constants.Permissions.SleepAnalysis,
              AppleHealthKitModule.Constants.Permissions.Weight,
              AppleHealthKitModule.Constants.Permissions.Height,
            ],
          },
        };

        AppleHealthKitModule.initHealthKit(permissions, (error: any) => {
          if (error) {
            console.warn('[FitnessBridge] Apple HealthKit permission error:', error);
            resolve(false);
          } else {
            resolve(true);
          }
        });
      });
    }

    // On web / simulator, simulated permissions always succeed
    return true;
  }

  /**
   * Open native system settings or Google Play Store if Health Connect is missing
   */
  public async openHealthSettings(): Promise<void> {
    if (Platform.OS === 'android') {
      try {
        if (HealthConnectModule?.openHealthConnectSettings) {
          await HealthConnectModule.openHealthConnectSettings();
          return;
        }
      } catch {}
      // Fallback: Open Health Connect in Google Play Store
      Linking.openURL('https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata');
    } else if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    }
  }

  /**
   * Pull live biometric telemetry from the available provider
   */
  public async fetchLiveBiometrics(): Promise<TelemetryMetrics> {
    const status = await this.checkAvailability();

    if (status.available && status.provider === 'health_connect' && HealthConnectModule) {
      return this.fetchFromHealthConnect();
    }

    if (status.available && status.provider === 'apple_health' && AppleHealthKitModule) {
      return this.fetchFromAppleHealthKit();
    }

    // Graceful fallback for Web, Expo Go, and Simulators
    return this.simulateDeviceSync();
  }

  /**
   * Android Health Connect Query Implementation
   */
  private async fetchFromHealthConnect(): Promise<TelemetryMetrics> {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).toISOString();
    const endOfToday = now.toISOString();

    let steps = 0;
    let activeCalories = 0;
    let restingHeartRate = 60;
    let heartRateVariability = 55;
    let sleepHours = 7.5;
    let deepSleepHours = 1.6;
    let weightKg: number | undefined;
    let heightCm: number | undefined;

    try {
      await HealthConnectModule.initialize();
      let granted = await HealthConnectModule.getGrantedPermissions();

      // If user hasn't granted permissions yet, auto-trigger the native Health Connect permission request dialog
      if (!Array.isArray(granted) || granted.length === 0) {
        console.log('[FitnessBridge] No Health Connect permissions granted yet. Prompting user for access...');
        await this.requestPermissions();
        granted = await HealthConnectModule.getGrantedPermissions();
      }

      const grantedRecordTypes = new Set(
        Array.isArray(granted)
          ? granted
              .filter((p: any) => p.accessType === 'read')
              .map((p: any) => p.recordType)
          : []
      );

      // If user declined all permissions, return fallback simulated telemetry without crashing
      if (grantedRecordTypes.size === 0) {
        console.warn('[FitnessBridge] Health Connect permissions not granted by user.');
        return this.simulateDeviceSync();
      }

      // 1. Steps
      if (grantedRecordTypes.has('Steps')) {
        try {
          const stepRecords = await HealthConnectModule.readRecords('Steps', {
            timeRangeFilter: { operator: 'between', startTime: startOfToday, endTime: endOfToday },
          });
          if (stepRecords?.records?.length > 0) {
            steps = stepRecords.records.reduce((sum: number, r: any) => sum + (r.count || 0), 0);
          }
        } catch (e) {
          console.warn('[FitnessBridge] Failed to read Steps:', e);
        }
      }

      // 2. Active Calories
      if (grantedRecordTypes.has('ActiveCaloriesBurned')) {
        try {
          const calRecords = await HealthConnectModule.readRecords('ActiveCaloriesBurned', {
            timeRangeFilter: { operator: 'between', startTime: startOfToday, endTime: endOfToday },
          });
          if (calRecords?.records?.length > 0) {
            activeCalories = Math.round(
              calRecords.records.reduce((sum: number, r: any) => sum + (r.energy?.inKilocalories || 0), 0)
            );
          }
        } catch (e) {
          console.warn('[FitnessBridge] Failed to read ActiveCaloriesBurned:', e);
        }
      }

      // 3. Resting Heart Rate
      if (grantedRecordTypes.has('RestingHeartRate')) {
        try {
          const rhrRecords = await HealthConnectModule.readRecords('RestingHeartRate', {
            timeRangeFilter: {
              operator: 'between',
              startTime: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
              endTime: endOfToday,
            },
          });
          if (rhrRecords?.records?.length > 0) {
            const latest = rhrRecords.records[rhrRecords.records.length - 1];
            restingHeartRate = Math.round(latest.beatsPerMinute || 60);
          }
        } catch (e) {
          console.warn('[FitnessBridge] Failed to read RestingHeartRate:', e);
        }
      }

      // 4. HRV (rMSSD)
      if (grantedRecordTypes.has('HeartRateVariabilityRmssd')) {
        try {
          const hrvRecords = await HealthConnectModule.readRecords('HeartRateVariabilityRmssd', {
            timeRangeFilter: {
              operator: 'between',
              startTime: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
              endTime: endOfToday,
            },
          });
          if (hrvRecords?.records?.length > 0) {
            const latest = hrvRecords.records[hrvRecords.records.length - 1];
            heartRateVariability = Math.round(latest.heartRateVariabilityMillis || 55);
          }
        } catch (e) {
          console.warn('[FitnessBridge] Failed to read HeartRateVariabilityRmssd:', e);
        }
      }

      // 5. Sleep Session (from last night)
      if (grantedRecordTypes.has('SleepSession')) {
        try {
          const sleepRecords = await HealthConnectModule.readRecords('SleepSession', {
            timeRangeFilter: {
              operator: 'between',
              startTime: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
              endTime: endOfToday,
            },
          });
          if (sleepRecords?.records?.length > 0) {
            const latestSleep = sleepRecords.records[sleepRecords.records.length - 1];
            const sleepDurationMs =
              new Date(latestSleep.endTime).getTime() - new Date(latestSleep.startTime).getTime();
            sleepHours = Math.round((sleepDurationMs / (1000 * 3600)) * 10) / 10;
            deepSleepHours = Math.round(sleepHours * 0.22 * 10) / 10;
          }
        } catch (e) {
          console.warn('[FitnessBridge] Failed to read SleepSession:', e);
        }
      }

      // 6. Weight (Query recent 30-day window first to respect Android 14/15/16 limits, then fallback to historical)
      if (grantedRecordTypes.has('Weight')) {
        try {
          const thirtyDaysAgo = new Date(Date.now() - 29 * 24 * 3600 * 1000).toISOString();
          let weightRecords: any = null;
          try {
            weightRecords = await HealthConnectModule.readRecords('Weight', {
              timeRangeFilter: {
                operator: 'between',
                startTime: thirtyDaysAgo,
                endTime: endOfToday,
              },
            });
          } catch (e30) {
            console.warn('[FitnessBridge] 30-day weight query failed:', e30);
          }

          // If no records in past 30 days, attempt full history query
          if (!weightRecords?.records?.length) {
            try {
              weightRecords = await HealthConnectModule.readRecords('Weight', {
                timeRangeFilter: {
                  operator: 'between',
                  startTime: '1970-01-01T00:00:00.000Z',
                  endTime: endOfToday,
                },
              });
            } catch (ehist) {
              console.log('[FitnessBridge] Historical weight query skipped/denied by OS:', ehist);
            }
          }

          if (weightRecords?.records?.length > 0) {
            console.log(`[FitnessBridge] Found ${weightRecords.records.length} weight record(s) in Health Connect`);
            const sorted = [...weightRecords.records].sort(
              (a: any, b: any) =>
                new Date(b.time || b.startTime || 0).getTime() -
                new Date(a.time || a.startTime || 0).getTime()
            );
            const latestWeight: any = sorted[0];
            const rawWeight =
              latestWeight?.weight?.inKilograms ??
              (latestWeight?.weight?.inPounds ? latestWeight.weight.inPounds * 0.453592 : null) ??
              latestWeight?.mass?.inKilograms ??
              (typeof latestWeight?.weight === 'number' ? latestWeight.weight : null) ??
              (typeof latestWeight?.value === 'number' ? latestWeight.value : null);
            if (typeof rawWeight === 'number' && rawWeight > 0) {
              weightKg = Math.round(rawWeight * 10) / 10;
              console.log(`[FitnessBridge] Synced weight: ${weightKg} kg`);
            }
          } else {
            console.log('[FitnessBridge] No weight records found in Health Connect (companion app may not write weight).');
          }
        } catch (e) {
          console.warn('[FitnessBridge] Failed to read Weight:', e);
        }
      }

      // 7. Height (Query recent 30-day window first, then fallback to historical)
      if (grantedRecordTypes.has('Height')) {
        try {
          const thirtyDaysAgo = new Date(Date.now() - 29 * 24 * 3600 * 1000).toISOString();
          let heightRecords: any = null;
          try {
            heightRecords = await HealthConnectModule.readRecords('Height', {
              timeRangeFilter: {
                operator: 'between',
                startTime: thirtyDaysAgo,
                endTime: endOfToday,
              },
            });
          } catch (e30) {
            console.warn('[FitnessBridge] 30-day height query failed:', e30);
          }

          // If no records in past 30 days, attempt full history query
          if (!heightRecords?.records?.length) {
            try {
              heightRecords = await HealthConnectModule.readRecords('Height', {
                timeRangeFilter: {
                  operator: 'between',
                  startTime: '1970-01-01T00:00:00.000Z',
                  endTime: endOfToday,
                },
              });
            } catch (ehist) {
              console.log('[FitnessBridge] Historical height query skipped/denied by OS:', ehist);
            }
          }

          if (heightRecords?.records?.length > 0) {
            console.log(`[FitnessBridge] Found ${heightRecords.records.length} height record(s) in Health Connect`);
            const sorted = [...heightRecords.records].sort(
              (a: any, b: any) =>
                new Date(b.time || b.startTime || 0).getTime() -
                new Date(a.time || a.startTime || 0).getTime()
            );
            const latestHeight: any = sorted[0];
            const rawMeters =
              latestHeight?.height?.inMeters ??
              (latestHeight?.height?.inInches ? latestHeight.height.inInches * 0.0254 : null) ??
              (latestHeight?.height?.inFeet ? latestHeight.height.inFeet * 0.3048 : null) ??
              latestHeight?.length?.inMeters ??
              (typeof latestHeight?.height === 'number' ? latestHeight.height : null) ??
              (typeof latestHeight?.value === 'number' ? latestHeight.value : null);
            if (typeof rawMeters === 'number' && rawMeters > 0) {
              // Convert meters to cm (or keep cm if > 50)
              heightCm =
                rawMeters > 50
                  ? Math.round(rawMeters * 10) / 10
                  : Math.round(rawMeters * 100 * 10) / 10;
              console.log(`[FitnessBridge] Synced height: ${heightCm} cm`);
            }
          } else {
            console.log('[FitnessBridge] No height records found in Health Connect (companion app may not write height).');
          }
        } catch (e) {
          console.warn('[FitnessBridge] Failed to read Height:', e);
        }
      }
    } catch (err) {
      console.warn('[FitnessBridge] Error querying Health Connect:', err);
    }

    const sleepQualityScore = Math.min(
      100,
      Math.max(30, Math.round((sleepHours / 8) * 70 + (deepSleepHours / 1.8) * 30))
    );

    const readinessScore = calculateReadinessScore({
      sleepHours,
      sleepQualityScore,
      restingHeartRate,
      heartRateVariability,
    });

    return {
      steps,
      activeCalories,
      restingHeartRate,
      heartRateVariability,
      sleepHours,
      sleepQualityScore,
      deepSleepHours,
      readinessScore,
      lastSyncTimestamp: Date.now(),
      source: 'health_connect',
      weightKg,
      heightCm,
    };
  }

  /**
   * iOS Apple HealthKit Query Implementation
   */
  private async fetchFromAppleHealthKit(): Promise<TelemetryMetrics> {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();

    return new Promise((resolve) => {
      let steps = 0;
      let activeCalories = 0;
      let restingHeartRate = 58;
      let heartRateVariability = 62;
      let sleepHours = 7.8;
      let deepSleepHours = 1.7;
      let weightKg: number | undefined;

      const opts = { startDate: startOfDay };

      // 1. Steps
      AppleHealthKitModule.getDailyStepCountSamples(opts, (err: any, results: any[]) => {
        if (!err && results?.length > 0) {
          steps = results.reduce((sum, r) => sum + (r.value || 0), 0);
        }

        // 2. Active Calories
        AppleHealthKitModule.getActiveEnergyBurned(opts, (calErr: any, calResults: any[]) => {
          if (!calErr && calResults?.length > 0) {
            activeCalories = Math.round(calResults.reduce((sum, r) => sum + (r.value || 0), 0));
          }

          // 3. Resting Heart Rate
          AppleHealthKitModule.getRestingHeartRate(
            { startDate: new Date(Date.now() - 48 * 3600 * 1000).toISOString() },
            (rhrErr: any, rhrResults: any[]) => {
              if (!rhrErr && rhrResults?.length > 0) {
                restingHeartRate = Math.round(rhrResults[rhrResults.length - 1]?.value || 58);
              }

              // 4. HRV
              AppleHealthKitModule.getHeartRateVariabilitySamples(
                { startDate: new Date(Date.now() - 48 * 3600 * 1000).toISOString() },
                (hrvErr: any, hrvResults: any[]) => {
                  if (!hrvErr && hrvResults?.length > 0) {
                    heartRateVariability = Math.round(hrvResults[hrvResults.length - 1]?.value || 62);
                  }

                  // 5. Sleep Samples
                  AppleHealthKitModule.getSleepSamples(
                    { startDate: new Date(Date.now() - 36 * 3600 * 1000).toISOString() },
                    (sleepErr: any, sleepResults: any[]) => {
                      if (!sleepErr && sleepResults?.length > 0) {
                        const totalSleepMs = sleepResults.reduce((acc, sample) => {
                          return acc + (new Date(sample.endDate).getTime() - new Date(sample.startDate).getTime());
                        }, 0);
                        sleepHours = Math.round((totalSleepMs / (1000 * 3600)) * 10) / 10;
                        deepSleepHours = Math.round(sleepHours * 0.22 * 10) / 10;
                      }

                      // 6. Weight
                      AppleHealthKitModule.getLatestWeight(null, (_wErr: any, weightRes: any) => {
                        if (weightRes?.value) {
                          weightKg = Math.round(weightRes.value * 10) / 10;
                        }

                        const sleepQualityScore = Math.min(
                          100,
                          Math.max(30, Math.round((sleepHours / 8) * 70 + (deepSleepHours / 1.8) * 30))
                        );

                        const readinessScore = calculateReadinessScore({
                          sleepHours,
                          sleepQualityScore,
                          restingHeartRate,
                          heartRateVariability,
                        });

                        resolve({
                          steps,
                          activeCalories,
                          restingHeartRate,
                          heartRateVariability,
                          sleepHours,
                          sleepQualityScore,
                          deepSleepHours,
                          readinessScore,
                          lastSyncTimestamp: Date.now(),
                          source: 'apple_health',
                          weightKg,
                        });
                      });
                    }
                  );
                }
              );
            }
          );
        });
      });
    });
  }

  /**
   * Realistic Wearable Simulation (used in Web, Simulator, and Expo Go)
   */
  public async simulateDeviceSync(): Promise<TelemetryMetrics> {
    // Small realistic sync latency
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Dynamic variance based on time of day
    const now = new Date();
    const hoursPast = now.getHours() + now.getMinutes() / 60;
    const stepBase = Math.round(Math.min(13500, Math.max(2500, (hoursPast / 24) * 11000 + (Math.random() * 1200 - 600))));
    const activeBurn = Math.round((stepBase / 10000) * 550 + Math.random() * 80);

    const sleepHours = 7.6;
    const deepSleepHours = 1.8;
    const sleepQualityScore = 88;
    const restingHeartRate = 54;
    const heartRateVariability = 68;

    const readinessScore = calculateReadinessScore({
      sleepHours,
      sleepQualityScore,
      restingHeartRate,
      heartRateVariability,
    });

    return {
      steps: stepBase,
      activeCalories: activeBurn,
      restingHeartRate,
      heartRateVariability,
      sleepHours,
      sleepQualityScore,
      deepSleepHours,
      readinessScore,
      lastSyncTimestamp: Date.now(),
      source: 'simulation',
      weightKg: 78.5,
    };
  }
}

export const fitnessBridge = new FitnessBridgeService();
