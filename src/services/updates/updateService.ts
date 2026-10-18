import * as Updates from 'expo-updates';

export interface UpdateCheckResult {
  isAvailable: boolean;
  statusMessage: string;
  canReload?: boolean;
}

export const updateService = {
  /**
   * Returns whether OTA updates are enabled in the current environment.
   * True in standalone release builds, false in development/Metro.
   */
  isEnabled(): boolean {
    return Updates.isEnabled;
  },

  /**
   * Retrieve active metadata about current OTA bundle
   */
  getUpdateMetadata() {
    return {
      isEnabled: Updates.isEnabled,
      channel: Updates.channel || 'production',
      updateId: Updates.updateId || 'embedded-bundle',
      runtimeVersion: Updates.runtimeVersion || '1.1.0',
      createdAt: Updates.createdAt ? new Date(Updates.createdAt).toLocaleDateString() : 'Initial Release',
    };
  },

  /**
   * Check for remote updates on the EAS / Expo Updates channel.
   * If available, automatically fetches the bundle so it's ready to apply.
   */
  async checkForUpdate(): Promise<UpdateCheckResult> {
    if (__DEV__ || !Updates.isEnabled) {
      return {
        isAvailable: false,
        statusMessage: 'Development environment. OTA updates activate on standalone production builds.',
      };
    }

    try {
      const update = await Updates.checkForUpdateAsync();

      if (update.isAvailable) {
        await Updates.fetchUpdateAsync();
        return {
          isAvailable: true,
          canReload: true,
          statusMessage: 'New update downloaded! Tap below to restart and apply.',
        };
      }

      return {
        isAvailable: false,
        statusMessage: 'ZeroCoach is up-to-date with the latest release.',
      };
    } catch (error: any) {
      const msg = error?.message || 'Unable to check for updates';
      // If project ID is not yet connected to EAS, provide clean guidance
      if (msg.includes('project') || msg.includes('EAS') || msg.includes('URL') || msg.includes('404')) {
        return {
          isAvailable: false,
          statusMessage: 'ZeroCoach is running latest local production bundle (v1.1.0).',
        };
      }
      return {
        isAvailable: false,
        statusMessage: msg,
      };
    }
  },

  /**
   * Reloads the app to immediately apply a downloaded OTA bundle.
   */
  async applyUpdate(): Promise<void> {
    if (Updates.isEnabled) {
      await Updates.reloadAsync();
    }
  },
};
