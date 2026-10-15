import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useCoachStore } from '@/store/useCoachStore';
import { COLORS, getModeColors } from '@/theme/colors';
import { SPACING, RADIUS } from '@/theme/spacing';
import { TYPOGRAPHY } from '@/theme/typography';
import { OnboardingScreen } from '@/screens/OnboardingScreen';
import { CoachChatScreen } from '@/screens/CoachChatScreen';
import { TelemetryScreen } from '@/screens/TelemetryScreen';
import { ProgressionsScreen } from '@/screens/ProgressionsScreen';
import { ModelManagerScreen } from '@/screens/ModelManagerScreen';
import {
  MessageSquare,
  Activity,
  Dumbbell,
  Settings,
} from 'lucide-react-native';

type TabKey = 'coach' | 'telemetry' | 'workout' | 'settings';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('coach');
  const { mode, hasCompletedOnboarding } = useCoachStore();
  const modeColors = getModeColors(mode);

  const TABS = [
    {
      key: 'coach' as const,
      label: 'COACH',
      icon: MessageSquare,
    },
    {
      key: 'telemetry' as const,
      label: 'TELEMETRY',
      icon: Activity,
    },
    {
      key: 'workout' as const,
      label: 'WORKOUT',
      icon: Dumbbell,
    },
    {
      key: 'settings' as const,
      label: 'SETTINGS',
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
                />
              )}
              {activeTab === 'telemetry' && <TelemetryScreen />}
              {activeTab === 'workout' && (
                <ProgressionsScreen
                  onNavigateToChat={() => setActiveTab('coach')}
                />
              )}
              {activeTab === 'settings' && <ModelManagerScreen />}
            </View>

            {/* High-Performance Bottom Tab Bar */}
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
                      >
                        {tab.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </SafeAreaView>
          </>
        )}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  screenContainer: {
    flex: 1,
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
