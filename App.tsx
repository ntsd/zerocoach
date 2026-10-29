import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Keyboard,
  AppState,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useCoachStore } from '@/store/useCoachStore';
import { useModelStore } from '@/store/useModelStore';
import { useTelemetryStore } from '@/store/useTelemetryStore';
import { COLORS, getModeColors } from '@/theme/colors';
import { SPACING, RADIUS } from '@/theme/spacing';
import { TYPOGRAPHY } from '@/theme/typography';
import { OnboardingScreen } from '@/screens/OnboardingScreen';
import { CoachChatScreen } from '@/screens/CoachChatScreen';
import { ProgressionsScreen } from '@/screens/ProgressionsScreen';
import { ModelManagerScreen } from '@/screens/ModelManagerScreen';
import { NutritionScreen } from '@/screens/NutritionScreen';
import { AnalyzeScreen } from '@/screens/AnalyzeScreen';
import { updateService } from '@/services/updates/updateService';
import { OtaUpdateModal } from '@/components/updates/OtaUpdateModal';
import { useTranslation } from '@/i18n';
import {
  MessageSquare,
  Activity,
  Dumbbell,
  Settings,
  Utensils,
  TrendingUp,
} from 'lucide-react-native';

type TabKey = 'coach' | 'nutrition' | 'workout' | 'analyze' | 'settings';

export default function App() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabKey>('coach');
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [showOtaModal, setShowOtaModal] = useState(false);
  const [hasDismissedOta, setHasDismissedOta] = useState(false);
  const { hasCompletedOnboarding } = useCoachStore();
  const modeColors = getModeColors();
  const otaMetadata = updateService.getUpdateMetadata();

  useEffect(() => {
    // Automatically download and load default model into RAM on native devices
    useModelStore.getState().autoInitOnDeviceModel();

    // Automatically sync telemetry from Android Health / HealthKit when onboarded
    if (hasCompletedOnboarding) {
      useTelemetryStore.getState().syncTelemetry();
    }

    // Automatically check for OTA updates on app startup
    const checkStartupOta = async () => {
      try {
        // Short pause to let UI mount and critical init settle
        await new Promise((resolve) => setTimeout(resolve, 1500));
        const result = await updateService.checkForUpdate();
        if (result.isAvailable && result.canReload) {
          setShowOtaModal(true);
        }
      } catch (err) {
        console.warn('[App] Startup OTA check error:', err);
      }
    };

    checkStartupOta();
  }, [hasCompletedOnboarding]);

  useEffect(() => {
    // Automatically sync fresh biometrics & check for updates when returning to foreground
    const sub = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        if (hasCompletedOnboarding) {
          useTelemetryStore.getState().syncTelemetry();
        }

        // Only check if user hasn't dismissed the update modal in this session
        if (!hasDismissedOta) {
          updateService
            .checkForUpdate()
            .then((res) => {
              if (res.isAvailable && res.canReload) {
                setShowOtaModal(true);
              }
            })
            .catch(() => {});
        }
      }
    });

    return () => sub.remove();
  }, [hasCompletedOnboarding, hasDismissedOta]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => setIsKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setIsKeyboardVisible(false));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const TABS = [
    {
      key: 'coach' as const,
      label: t.tabs.coach,
      icon: MessageSquare,
    },
    {
      key: 'nutrition' as const,
      label: t.tabs.nutrition,
      icon: Utensils,
    },
    {
      key: 'workout' as const,
      label: t.tabs.workout,
      icon: Dumbbell,
    },
    {
      key: 'analyze' as const,
      label: t.tabs.analyze,
      icon: TrendingUp,
    },
    {
      key: 'settings' as const,
      label: t.tabs.settings,
      icon: Settings,
    },
  ];

  return (
    <SafeAreaProvider>
      <View style={styles.root}>
        <StatusBar style="light" />

        {/* If user hasn't completed onboarding, render Onboarding Flow */}
        {!hasCompletedOnboarding ? (
          <OnboardingScreen onComplete={() => setActiveTab('coach')} />
        ) : (
          <>
            {/* Screen Container */}
            <View style={styles.screenContainer}>
              {activeTab === 'coach' && (
                <CoachChatScreen
                  onNavigateToWorkout={() => setActiveTab('workout')}
                  onNavigateToNutrition={() => setActiveTab('nutrition')}
                  onNavigateToSettings={() => setActiveTab('settings')}
                />
              )}
              {activeTab === 'nutrition' && <NutritionScreen />}
              {activeTab === 'workout' && (
                <ProgressionsScreen
                  onNavigateToChat={() => setActiveTab('coach')}
                />
              )}
              {activeTab === 'analyze' && <AnalyzeScreen />}
              {activeTab === 'settings' && <ModelManagerScreen />}
            </View>

            {/* High-Performance Bottom Tab Bar (hidden when keyboard is open) */}
            {!isKeyboardVisible && (
              <SafeAreaView edges={['bottom']} style={styles.bottomBarContainer}>
                <View
                  style={[
                    styles.bottomBar,
                    { borderColor: 'rgba(255, 255, 255, 0.08)' },
                  ]}
                >
                  {TABS.map((tab) => {
                    const isActive = activeTab === tab.key;
                    const IconComponent = tab.icon;

                    return (
                      <TouchableOpacity
                        key={tab.key}
                        onPress={() => setActiveTab(tab.key)}
                        style={[
                          styles.tabItem,
                          isActive && styles.tabItemActive,
                          isActive && {
                            borderTopColor: modeColors.accent,
                            backgroundColor: `${modeColors.accent}0D`,
                          },
                        ]}
                        activeOpacity={0.7}
                      >
                        <IconComponent
                          size={20}
                          color={isActive ? modeColors.accent : COLORS.textMuted}
                        />
                        <Text
                          style={[
                            styles.tabLabel,
                            isActive ? styles.tabLabelActive : styles.tabLabelInactive,
                            isActive && { color: modeColors.accent },
                          ]}
                          numberOfLines={1}
                        >
                          {tab.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </SafeAreaView>
            )}
          </>
        )}

        {/* Over-The-Air Update Available Popup */}
        <OtaUpdateModal
          visible={showOtaModal}
          onClose={() => {
            setShowOtaModal(false);
            setHasDismissedOta(true);
          }}
          onApplyUpdate={async () => {
            await updateService.applyUpdate();
          }}
          channel={otaMetadata.channel}
          runtimeVersion={otaMetadata.runtimeVersion}
        />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
    overflow: 'hidden',
  },
  screenContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  bottomBarContainer: {
    backgroundColor: COLORS.cardBackground,
  },
  bottomBar: {
    flexDirection: 'row',
    height: 60,
    backgroundColor: COLORS.cardBackground,
    borderTopWidth: 1,
    paddingHorizontal: SPACING.sm,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    borderTopWidth: 2,
    borderTopColor: 'transparent',
    paddingVertical: 4,
  },
  tabItemActive: {
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  tabLabel: {
    ...TYPOGRAPHY.badge,
    fontSize: 9,
    letterSpacing: 0.5,
  },
  tabLabelActive: {
    fontWeight: '800',
  },
  tabLabelInactive: {
    color: COLORS.textMuted,
  },
});
