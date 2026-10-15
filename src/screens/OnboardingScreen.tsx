import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCoachStore } from '@/store/useCoachStore';
import { useTelemetryStore } from '@/store/useTelemetryStore';
import { CoachingMode, UserProfile, TrainingGoal, Gender, EquipmentPreference } from '@/types/coach';
import { calculateReadinessScore, getReadinessCategory } from '@/services/telemetry/readinessCalculator';
import { calculateSmartNutrition } from '@/services/nutrition/nutritionCalculator';
import { healthAdapter } from '@/services/telemetry/healthConnectAdapter';
import { COLORS, getModeColors } from '@/theme/colors';
import { SPACING, RADIUS } from '@/theme/spacing';
import { TYPOGRAPHY } from '@/theme/typography';
import { GlassCard } from '@/components/common/GlassCard';
import {
  ShieldAlert,
  HeartHandshake,
  User,
  Activity,
  Flame,
  Moon,
  Heart,
  Footprints,
  ArrowRight,
  ArrowLeft,
  Check,
  Sparkles,
  Watch,
  Weight,
  Ruler,
  RefreshCw,
  Zap,
  Info,
} from 'lucide-react-native';

export const COMMON_TRAINING_GOALS: Array<{
  id: TrainingGoal;
  label: string;
  desc: string;
}> = [
  {
    id: 'strength_hypertrophy',
    label: '💪 Strength & Hypertrophy',
    desc: 'Build lean muscle mass, raw power, and progressive overload',
  },
  {
    id: 'calisthenics_mastery',
    label: '🤸 Calisthenics Mastery',
    desc: 'Master bodyweight control, L-Sit, Muscle-Up, and gymnastics skills',
  },
  {
    id: 'fat_loss_recomp',
    label: '🔥 Fat Loss & Recomposition',
    desc: 'Target caloric deficit, lean definition, and active metabolic burn',
  },
  {
    id: 'cardio_endurance',
    label: '🏃 Cardio & Aerobic Endurance',
    desc: 'Stamina, running/cycling capacity, VO2 max, and heart conditioning',
  },
  {
    id: 'daily_health_longevity',
    label: '🌿 Daily Health & Longevity',
    desc: 'Joint mobility, posture, stress relief, and restorative vitality',
  },
];

interface OnboardingScreenProps {
  onComplete: () => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const { completeOnboarding } = useCoachStore();
  const { setManualTelemetry } = useTelemetryStore();

  // Wizard Steps (1: Telemetry Sync, 2: Mode, 3: Profile & Goals, 4: Nutrition & Macros)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Fitness App Sync state
  const [hasFitnessApp, setHasFitnessApp] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncedSource, setSyncedSource] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Physical Metrics (Body weight & height must be entered by user or synced)
  const [weightKg, setWeightKg] = useState('');
  const [heightCm, setHeightCm] = useState('');

  // Wearable Telemetry (NEVER manually counted - only populated when fitness app is synced)
  const [sleepHours, setSleepHours] = useState<number | null>(null);
  const [sleepQuality, setSleepQuality] = useState<number | null>(null);
  const [restingHeartRate, setRestingHeartRate] = useState<number | null>(null);
  const [steps, setSteps] = useState<number | null>(null);
  const [activeCalories, setActiveCalories] = useState<number | null>(null);

  // Step 2: Coaching Philosophy
  const [selectedMode, setSelectedMode] = useState<CoachingMode>('strict');

  // Step 3: Profile & Goals (starts empty by default)
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender>('male');
  const [equipmentPreference, setEquipmentPreference] = useState<EquipmentPreference>('gym');
  const [selectedGoals, setSelectedGoals] = useState<TrainingGoal[]>([]);

  // Step 4: Nutrition State
  const [calorieTarget, setCalorieTarget] = useState('');
  const [proteinGrams, setProteinGrams] = useState('');
  const [carbsGrams, setCarbsGrams] = useState('');
  const [fatGrams, setFatGrams] = useState('');
  const [hasCustomMacros, setHasCustomMacros] = useState(false);

  const modeColors = getModeColors(selectedMode);

  const parsedWeight = parseFloat(weightKg);
  const parsedHeight = parseFloat(heightCm);
  const isBodyMetricsValid =
    !isNaN(parsedWeight) && parsedWeight > 0 && !isNaN(parsedHeight) && parsedHeight > 0;

  // Calculate smart nutrition reactively from Profile, Goals, Gender, and Telemetry Active Burn (if synced)
  const smartRecommendation = useMemo(() => {
    if (!isBodyMetricsValid) {
      return {
        dailyCalories: 0,
        proteinGrams: 0,
        carbsGrams: 0,
        fatGrams: 0,
        bmr: 0,
        tdee: 0,
        goalAdjustmentKcal: 0,
        goalSummary: 'Weight and height required for calculation',
        isActiveBurnFromWearable: false,
      };
    }
    return calculateSmartNutrition({
      weightKg: parsedWeight,
      heightCm: parsedHeight,
      mode: selectedMode,
      goals: selectedGoals,
      activeCaloriesBurned: activeCalories ?? 0,
      gender,
    });
  }, [parsedWeight, parsedHeight, isBodyMetricsValid, selectedMode, selectedGoals, activeCalories, gender]);

  // Automatically update macro fields when recommendation changes, unless customized by user
  useEffect(() => {
    if (!hasCustomMacros && isBodyMetricsValid && smartRecommendation.dailyCalories > 0) {
      setCalorieTarget(smartRecommendation.dailyCalories.toString());
      setProteinGrams(smartRecommendation.proteinGrams.toString());
      setCarbsGrams(smartRecommendation.carbsGrams.toString());
      setFatGrams(smartRecommendation.fatGrams.toString());
    }
  }, [smartRecommendation, hasCustomMacros, isBodyMetricsValid]);

  // Preview readiness calculation (only when wearable telemetry is synced)
  const previewReadiness = useMemo(() => {
    if (sleepHours === null || restingHeartRate === null) return null;
    return calculateReadinessScore({
      sleepHours,
      sleepQualityScore: sleepQuality ?? 0,
      restingHeartRate,
      heartRateVariability: 50,
    });
  }, [sleepHours, sleepQuality, restingHeartRate]);

  const readinessCategory = previewReadiness !== null ? getReadinessCategory(previewReadiness) : null;

  // Sync with local fitness bridge (Google Fit / Health Connect / Garmin / Xiaomi)
  const handleSyncFitnessApp = async () => {
    setIsSyncing(true);
    setSyncError(null);
    try {
      const fresh = await healthAdapter.fetchLatestMetrics();
      if (fresh.weightKg) setWeightKg(fresh.weightKg.toString());
      if (fresh.heightCm) setHeightCm(fresh.heightCm.toString());
      setSleepHours(fresh.sleepHours);
      setSleepQuality(fresh.sleepQualityScore);
      setRestingHeartRate(fresh.restingHeartRate);
      setSteps(fresh.steps);
      setActiveCalories(fresh.activeCalories);
      setSyncedSource(fresh.source === 'google_fit' ? 'Google Fit' : fresh.source.toUpperCase());
      setHasFitnessApp(true);
    } catch (e: any) {
      setSyncError(
        e?.message ||
          'No fitness app detected on this device. Please enter your weight and height directly.'
      );
    } finally {
      setIsSyncing(false);
    }
  };

  const toggleGoal = (goalId: TrainingGoal) => {
    setSelectedGoals((prev) => {
      if (prev.includes(goalId)) {
        return prev.filter((g) => g !== goalId);
      }
      return [...prev, goalId];
    });
  };

  const resetToAutoCalculated = () => {
    setHasCustomMacros(false);
    if (isBodyMetricsValid && smartRecommendation.dailyCalories > 0) {
      setCalorieTarget(smartRecommendation.dailyCalories.toString());
      setProteinGrams(smartRecommendation.proteinGrams.toString());
      setCarbsGrams(smartRecommendation.carbsGrams.toString());
      setFatGrams(smartRecommendation.fatGrams.toString());
    }
  };

  const canProceed = useMemo(() => {
    if (currentStep === 1) {
      return isBodyMetricsValid;
    }
    if (currentStep === 3) {
      return selectedGoals.length > 0;
    }
    return true;
  }, [currentStep, isBodyMetricsValid, selectedGoals]);

  const handleFinish = () => {
    const finalWeight = parseFloat(weightKg) || 0;
    const finalHeight = parseFloat(heightCm) || 0;

    const profile: UserProfile = {
      name: name.trim(),
      gender,
      equipmentPreference,
      weightKg: finalWeight,
      heightCm: finalHeight,
      dailyCalorieTarget: parseInt(calorieTarget, 10) || smartRecommendation.dailyCalories,
      proteinGrams: parseInt(proteinGrams, 10) || smartRecommendation.proteinGrams,
      carbsGrams: parseInt(carbsGrams, 10) || smartRecommendation.carbsGrams,
      fatGrams: parseInt(fatGrams, 10) || smartRecommendation.fatGrams,
      primaryGoals: selectedGoals,
    };

    if (syncedSource && sleepHours !== null && steps !== null && activeCalories !== null) {
      // Telemetry was synced from fitness app
      setManualTelemetry({
        sleepHours,
        sleepQualityScore: sleepQuality ?? 0,
        restingHeartRate: restingHeartRate ?? 0,
        heartRateVariability: 0,
        steps,
        activeCalories,
        weightKg: finalWeight,
        heightCm: finalHeight,
      });
    } else {
      // No fitness app synced - baseline without fabricated metrics
      setManualTelemetry({
        sleepHours: 0,
        sleepQualityScore: 0,
        restingHeartRate: 0,
        heartRateVariability: 0,
        steps: 0,
        activeCalories: 0,
        weightKg: finalWeight,
        heightCm: finalHeight,
      });
    }

    completeOnboarding(profile, selectedMode);
    onComplete();
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 1:
        return 'Fitness Telemetry & App Sync';
      case 2:
        return 'Coaching Philosophy';
      case 3:
        return 'Profile & Training Goals';
      case 4:
        return 'Daily Nutrition & Smart Macros';
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header Indicator */}
        <View style={styles.header}>
          <View style={styles.stepIndicatorRow}>
            {[1, 2, 3, 4].map((step) => (
              <View
                key={step}
                style={[
                  styles.stepDot,
                  currentStep === step && styles.stepDotActive,
                  currentStep === step && { backgroundColor: modeColors.accent },
                  currentStep > step && styles.stepDotCompleted,
                  currentStep > step && { backgroundColor: COLORS.success },
                ]}
              />
            ))}
          </View>
          <View style={styles.headerRight}>
            <Text style={[styles.stepCountText, { color: modeColors.accent }]}>
              STEP {currentStep} OF 4
            </Text>
            <Text style={styles.stepTitleSubtitle}>{getStepTitle()}</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ===================================================================
              STEP 1: FITNESS TELEMETRY & WEARABLE SYNC (1st PAGE)
              =================================================================== */}
          {currentStep === 1 && (
            <View style={styles.stepContainer}>
              <View style={styles.titleBox}>
                <Text style={styles.mainTitle}>Connect Fitness Telemetry</Text>
                <Text style={styles.subtitle}>
                  Sync with your fitness app (Google Fit, Garmin, Xiaomi, Health Connect) to automatically pull your Weight, Height, Active Burn, and Sleep. Or continue without a wearable:
                </Text>
              </View>

              {/* Mode Toggle: Sync App vs No App */}
              <View style={styles.telemetryToggleRow}>
                <TouchableOpacity
                  onPress={() => setHasFitnessApp(true)}
                  style={[
                    styles.toggleBtn,
                    hasFitnessApp && styles.toggleBtnActive,
                    hasFitnessApp && { borderColor: modeColors.accent },
                  ]}
                  activeOpacity={0.8}
                >
                  <Watch size={16} color={hasFitnessApp ? modeColors.accent : COLORS.textMuted} />
                  <Text
                    style={[
                      styles.toggleBtnText,
                      hasFitnessApp && { color: modeColors.accent, fontWeight: '700' },
                    ]}
                  >
                    Fitness App Sync
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setHasFitnessApp(false);
                    setSyncedSource(null);
                    setSleepHours(null);
                    setSleepQuality(null);
                    setRestingHeartRate(null);
                    setSteps(null);
                    setActiveCalories(null);
                  }}
                  style={[
                    styles.toggleBtn,
                    !hasFitnessApp && styles.toggleBtnActive,
                    !hasFitnessApp && { borderColor: modeColors.accent },
                  ]}
                  activeOpacity={0.8}
                >
                  <User size={16} color={!hasFitnessApp ? modeColors.accent : COLORS.textMuted} />
                  <Text
                    style={[
                      styles.toggleBtnText,
                      !hasFitnessApp && { color: modeColors.accent, fontWeight: '700' },
                    ]}
                  >
                    No Fitness App (Skip)
                  </Text>
                </TouchableOpacity>
              </View>

              {hasFitnessApp ? (
                <GlassCard style={styles.formCard}>
                  {/* Supported Providers Badge Row */}
                  <View style={styles.providersRow}>
                    <Text style={styles.providerBadge}>Google Fit</Text>
                    <Text style={styles.providerBadge}>Garmin</Text>
                    <Text style={styles.providerBadge}>Xiaomi</Text>
                    <Text style={styles.providerBadge}>Health Connect</Text>
                  </View>

                  {/* Sync Trigger CTA */}
                  <TouchableOpacity
                    onPress={handleSyncFitnessApp}
                    disabled={isSyncing}
                    style={[styles.syncCTAButton, { backgroundColor: modeColors.accent }]}
                    activeOpacity={0.85}
                  >
                    {isSyncing ? (
                      <ActivityIndicator size="small" color={COLORS.textDark} />
                    ) : (
                      <Zap size={18} color={COLORS.textDark} />
                    )}
                    <Text style={styles.syncCTAButtonText}>
                      {isSyncing ? 'Connecting Local Bridge...' : 'Sync Fitness App Now'}
                    </Text>
                  </TouchableOpacity>

                  {syncedSource ? (
                    <View style={styles.syncedDetailsBox}>
                      <View style={styles.syncedHeaderRow}>
                        <View style={styles.syncedCheckBadge}>
                          <Check size={12} color={COLORS.success} />
                          <Text style={styles.syncedCheckText}>
                            Connected to {syncedSource} (Local On-Device)
                          </Text>
                        </View>
                        <Text style={styles.syncedTimestamp}>Just now</Text>
                      </View>

                      {/* 4-Stat Synced Grid */}
                      <View style={styles.statsGrid}>
                        <View style={styles.statTile}>
                          <Weight size={14} color={modeColors.accent} />
                          <Text style={styles.statLabel}>BODY WEIGHT</Text>
                          <Text style={styles.statValue}>{weightKg} kg</Text>
                        </View>

                        <View style={styles.statTile}>
                          <Ruler size={14} color={modeColors.accent} />
                          <Text style={styles.statLabel}>HEIGHT</Text>
                          <Text style={styles.statValue}>{heightCm} cm</Text>
                        </View>

                        <View style={styles.statTile}>
                          <Flame size={14} color={COLORS.warning} />
                          <Text style={styles.statLabel}>ACTIVE BURN</Text>
                          <Text style={styles.statValue}>{activeCalories} kcal</Text>
                        </View>

                        <View style={styles.statTile}>
                          <Footprints size={14} color={COLORS.strict.accent} />
                          <Text style={styles.statLabel}>DAILY STEPS</Text>
                          <Text style={styles.statValue}>{Number(steps ?? 0).toLocaleString()}</Text>
                        </View>
                      </View>

                      {/* Resting HR and Sleep Row */}
                      <View style={styles.metricsSummaryRow}>
                        <View style={styles.metricPill}>
                          <Heart size={12} color={COLORS.danger} />
                          <Text style={styles.metricPillText}>RHR: {restingHeartRate} bpm</Text>
                        </View>
                        <View style={styles.metricPill}>
                          <Moon size={12} color={COLORS.purpleAccent} />
                          <Text style={styles.metricPillText}>Sleep: {sleepHours}h ({sleepQuality}/100)</Text>
                        </View>
                      </View>

                      {/* Readiness Score Preview */}
                      {readinessCategory && (
                        <View style={styles.readinessPreviewBox}>
                          <View style={styles.previewTop}>
                            <Text style={styles.previewTitle}>RECOVERY READINESS</Text>
                            <Text style={[styles.previewScore, { color: readinessCategory.color }]}>
                              {previewReadiness}/100
                            </Text>
                          </View>
                          <Text style={[styles.previewCategory, { color: readinessCategory.color }]}>
                            {readinessCategory.label}
                          </Text>
                          <Text style={styles.previewGuidance}>{readinessCategory.guidance}</Text>
                        </View>
                      )}
                    </View>
                  ) : (
                    <>
                      <View style={styles.syncCardContent}>
                        <Watch size={28} color={modeColors.accent} />
                        <Text style={styles.syncCardTitle}>Local Wearable Bridges</Text>
                        <Text style={styles.syncCardDesc}>
                          Tap "Sync Fitness App Now" to pull local health records. If no fitness app is connected, enter your Weight & Height below:
                        </Text>
                      </View>

                      {syncError && (
                        <View style={styles.syncErrorBox}>
                          <ShieldAlert size={14} color={COLORS.danger} />
                          <Text style={styles.syncErrorText}>{syncError}</Text>
                        </View>
                      )}

                      <View style={[styles.rowInputs, { marginTop: SPACING.md }]}>
                        <View style={styles.halfInput}>
                          <View style={styles.labelRow}>
                            <Weight size={13} color={modeColors.accent} />
                            <Text style={styles.inputLabel}>BODY WEIGHT (KG)</Text>
                          </View>
                          <TextInput
                            style={styles.textInput}
                            keyboardType="decimal-pad"
                            placeholder="e.g. 70"
                            placeholderTextColor={COLORS.textMuted}
                            value={weightKg}
                            onChangeText={setWeightKg}
                          />
                        </View>

                        <View style={styles.halfInput}>
                          <View style={styles.labelRow}>
                            <Ruler size={13} color={modeColors.accent} />
                            <Text style={styles.inputLabel}>HEIGHT (CM)</Text>
                          </View>
                          <TextInput
                            style={styles.textInput}
                            keyboardType="number-pad"
                            placeholder="e.g. 175"
                            placeholderTextColor={COLORS.textMuted}
                            value={heightCm}
                            onChangeText={setHeightCm}
                          />
                        </View>
                      </View>
                    </>
                  )}
                </GlassCard>
              ) : (
                <GlassCard style={styles.formCard}>
                  <View style={styles.noAppInfoBox}>
                    <Info size={18} color={modeColors.accent} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.noAppTitle}>Continuing Without a Fitness App</Text>
                      <Text style={styles.noAppDesc}>
                        No wearable tracker needed. ZeroCoach will calculate your customized workout volume and nutrition blueprint using only your body metrics and training goals. You can sync a wearable anytime later in the Telemetry tab.
                      </Text>
                    </View>
                  </View>

                  {/* Weight & Height Inputs Only */}
                  <View style={[styles.rowInputs, { marginTop: SPACING.md }]}>
                    <View style={styles.halfInput}>
                      <View style={styles.labelRow}>
                        <Weight size={13} color={modeColors.accent} />
                        <Text style={styles.inputLabel}>BODY WEIGHT (KG)</Text>
                      </View>
                      <TextInput
                        style={styles.textInput}
                        keyboardType="decimal-pad"
                        placeholder="e.g. 70"
                        placeholderTextColor={COLORS.textMuted}
                        value={weightKg}
                        onChangeText={setWeightKg}
                      />
                    </View>

                    <View style={styles.halfInput}>
                      <View style={styles.labelRow}>
                        <Ruler size={13} color={modeColors.accent} />
                        <Text style={styles.inputLabel}>HEIGHT (CM)</Text>
                      </View>
                      <TextInput
                        style={styles.textInput}
                        keyboardType="number-pad"
                        placeholder="e.g. 175"
                        placeholderTextColor={COLORS.textMuted}
                        value={heightCm}
                        onChangeText={setHeightCm}
                      />
                    </View>
                  </View>
                </GlassCard>
              )}
            </View>
          )}

          {/* ===================================================================
              STEP 2: COACHING PHILOSOPHY
              =================================================================== */}
          {currentStep === 2 && (
            <View style={styles.stepContainer}>
              <View style={styles.titleBox}>
                <Text style={styles.mainTitle}>Choose Your Coaching Philosophy</Text>
                <Text style={styles.subtitle}>
                  ZeroCoach adapts its tone, programming rigor, and recovery logic based on your preferred style:
                </Text>
              </View>

              {/* Strict Mode Card */}
              <TouchableOpacity
                onPress={() => setSelectedMode('strict')}
                activeOpacity={0.85}
              >
                <GlassCard
                  style={[
                    styles.modeCard,
                    selectedMode === 'strict' && styles.modeCardSelected,
                    selectedMode === 'strict' && { borderColor: COLORS.strict.accent },
                  ]}
                >
                  <View style={styles.modeCardHeader}>
                    <View style={styles.modeIconRow}>
                      <ShieldAlert size={20} color={COLORS.strict.accent} />
                      <Text style={[styles.modeTitle, { color: COLORS.strict.accent }]}>
                        STRICT ATHLETE MODE
                      </Text>
                    </View>
                    {selectedMode === 'strict' && (
                      <View style={[styles.checkCircle, { backgroundColor: COLORS.strict.accent }]}>
                        <Check size={12} color={COLORS.textDark} />
                      </View>
                    )}
                  </View>
                  <Text style={styles.modeDescription}>
                    Data-driven sports scientist persona. Direct, structured, periodized training, precise macronutrient targets, and zero fluff.
                  </Text>
                  <View style={styles.bulletList}>
                    <Text style={styles.bullet}>• Mechanical cues & joint alignment breakdown</Text>
                    <Text style={styles.bullet}>• Strict accountability to daily macro limits</Text>
                    <Text style={styles.bullet}>• Enforces deloads when readiness drops below 60</Text>
                  </View>
                </GlassCard>
              </TouchableOpacity>

              {/* Comfortable Mode Card */}
              <TouchableOpacity
                onPress={() => setSelectedMode('comfortable')}
                activeOpacity={0.85}
              >
                <GlassCard
                  style={[
                    styles.modeCard,
                    selectedMode === 'comfortable' && styles.modeCardSelected,
                    selectedMode === 'comfortable' && { borderColor: COLORS.comfortable.accent },
                  ]}
                >
                  <View style={styles.modeCardHeader}>
                    <View style={styles.modeIconRow}>
                      <HeartHandshake size={20} color={COLORS.comfortable.accent} />
                      <Text style={[styles.modeTitle, { color: COLORS.comfortable.accent }]}>
                        COMFORTABLE HEALTH MODE
                      </Text>
                    </View>
                    {selectedMode === 'comfortable' && (
                      <View style={[styles.checkCircle, { backgroundColor: COLORS.comfortable.accent }]}>
                        <Check size={12} color={COLORS.textDark} />
                      </View>
                    )}
                  </View>
                  <Text style={styles.modeDescription}>
                    Compassionate wellness guide. Flexible, encouraging, focused on lifelong health, stress management, and sustainable micro-habits.
                  </Text>
                  <View style={styles.bulletList}>
                    <Text style={styles.bullet}>• Encouraging feedback and positive reinforcement</Text>
                    <Text style={styles.bullet}>• Adaptable goals that fit around busy schedules</Text>
                    <Text style={styles.bullet}>• Focuses on energy, vitality, and well-being</Text>
                  </View>
                </GlassCard>
              </TouchableOpacity>
            </View>
          )}

          {/* ===================================================================
              STEP 3: PROFILE & TRAINING GOALS (5 PILLARS)
              =================================================================== */}
          {currentStep === 3 && (
            <View style={styles.stepContainer}>
              <View style={styles.titleBox}>
                <Text style={styles.mainTitle}>Your Profile & Goals</Text>
                <Text style={styles.subtitle}>
                  Verify your body metrics and select your primary training objectives from the 5 Core Pillars:
                </Text>
              </View>

              <GlassCard style={styles.formCard}>
                <Text style={styles.inputLabel}>YOUR ATHLETE NAME</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Alex"
                  placeholderTextColor={COLORS.textMuted}
                  value={name}
                  onChangeText={setName}
                />

                {/* Body Metrics with sync indicator */}
                <View style={[styles.rowInputs, { marginTop: SPACING.md }]}>
                  <View style={styles.halfInput}>
                    <View style={styles.labelRow}>
                      <Text style={styles.inputLabel}>WEIGHT (KG)</Text>
                      {syncedSource && (
                        <View style={styles.syncedMiniTag}>
                          <Text style={styles.syncedMiniText}>Synced</Text>
                        </View>
                      )}
                    </View>
                    <TextInput
                      style={styles.textInput}
                      keyboardType="decimal-pad"
                      placeholder="e.g. 70"
                      placeholderTextColor={COLORS.textMuted}
                      value={weightKg}
                      onChangeText={setWeightKg}
                    />
                  </View>

                  <View style={styles.halfInput}>
                    <View style={styles.labelRow}>
                      <Text style={styles.inputLabel}>HEIGHT (CM)</Text>
                      {syncedSource && (
                        <View style={styles.syncedMiniTag}>
                          <Text style={styles.syncedMiniText}>Synced</Text>
                        </View>
                      )}
                    </View>
                    <TextInput
                      style={styles.textInput}
                      keyboardType="number-pad"
                      placeholder="e.g. 175"
                      placeholderTextColor={COLORS.textMuted}
                      value={heightCm}
                      onChangeText={setHeightCm}
                    />
                  </View>
                </View>

                {/* Gender / Biological Profile */}
                <View style={{ marginTop: SPACING.md }}>
                  <Text style={styles.inputLabel}>GENDER / BIOLOGICAL PROFILE</Text>
                  <View style={styles.segmentedSelectorRow}>
                    {(
                      [
                        { id: 'male', label: 'Male 👨', sub: 'Neural Drive Focus' },
                        { id: 'female', label: 'Female 👩', sub: 'Volume Tolerance' },
                        { id: 'other', label: 'Other 🧑', sub: 'Balanced Protocol' },
                      ] as const
                    ).map((item) => {
                      const isSelected = gender === item.id;
                      return (
                        <TouchableOpacity
                          key={item.id}
                          onPress={() => setGender(item.id)}
                          style={[
                            styles.segmentedSelectorOption,
                            isSelected && {
                              borderColor: modeColors.accent,
                              backgroundColor: `${modeColors.accent}20`,
                            },
                          ]}
                          activeOpacity={0.8}
                        >
                          <Text
                            style={[
                              styles.segmentedSelectorText,
                              isSelected && { color: modeColors.accent, fontWeight: '700' },
                            ]}
                          >
                            {item.label}
                          </Text>
                          <Text style={styles.segmentedSelectorSub}>{item.sub}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Primary Workout Environment */}
                <View style={{ marginTop: SPACING.md }}>
                  <Text style={styles.inputLabel}>PRIMARY WORKOUT ENVIRONMENT</Text>
                  <View style={styles.segmentedSelectorRow}>
                    {(
                      [
                        { id: 'gym', label: '🏋️ Full Gym', sub: 'Barbells, DBs, Cables' },
                        { id: 'home', label: '🏠 Home / BW', sub: 'Bodyweight & Calisthenics' },
                        { id: 'both', label: '🔄 Hybrid / Both', sub: 'Flexible Training' },
                      ] as const
                    ).map((item) => {
                      const isSelected = equipmentPreference === item.id;
                      return (
                        <TouchableOpacity
                          key={item.id}
                          onPress={() => setEquipmentPreference(item.id)}
                          style={[
                            styles.segmentedSelectorOption,
                            isSelected && {
                              borderColor: modeColors.accent,
                              backgroundColor: `${modeColors.accent}20`,
                            },
                          ]}
                          activeOpacity={0.8}
                        >
                          <Text
                            style={[
                              styles.segmentedSelectorText,
                              isSelected && { color: modeColors.accent, fontWeight: '700' },
                            ]}
                          >
                            {item.label}
                          </Text>
                          <Text style={styles.segmentedSelectorSub}>{item.sub}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Primary Training Goals */}
                <View style={styles.goalsHeaderRow}>
                  <Text style={styles.inputLabel}>PRIMARY TRAINING GOALS (MULTI-SELECT)</Text>
                  <Text style={[styles.goalsCountBadge, { color: modeColors.accent }]}>
                    {selectedGoals.length} SELECTED
                  </Text>
                </View>

                <View style={styles.goalsWrap}>
                  {COMMON_TRAINING_GOALS.map((goal) => {
                    const isSelected = selectedGoals.includes(goal.id);
                    return (
                      <TouchableOpacity
                        key={goal.id}
                        onPress={() => toggleGoal(goal.id)}
                        style={[
                          styles.goalCard,
                          isSelected && styles.goalCardSelected,
                          isSelected && {
                            borderColor: modeColors.accent,
                            backgroundColor: `${modeColors.accent}12`,
                          },
                        ]}
                        activeOpacity={0.75}
                      >
                        <View style={styles.goalCardHeader}>
                          <Text
                            style={[
                              styles.goalLabelText,
                              isSelected && { color: modeColors.accent, fontWeight: '700' },
                            ]}
                          >
                            {goal.label}
                          </Text>
                          <View
                            style={[
                              styles.goalCheckbox,
                              isSelected && {
                                backgroundColor: modeColors.accent,
                                borderColor: modeColors.accent,
                              },
                            ]}
                          >
                            {isSelected && <Check size={11} color={COLORS.textDark} />}
                          </View>
                        </View>
                        <Text style={styles.goalDescText}>{goal.desc}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </GlassCard>
            </View>
          )}

          {/* ===================================================================
              STEP 4: DAILY NUTRITION BASELINE & SMART MACROS
              =================================================================== */}
          {currentStep === 4 && (
            <View style={styles.stepContainer}>
              <View style={styles.titleBox}>
                <Text style={styles.mainTitle}>Daily Nutrition & Smart Macros</Text>
                <Text style={styles.subtitle}>
                  Dynamically calculated from your Profile ({weightKg}kg, {heightCm}cm), Training Goals ({selectedGoals.length} selected), and Fitness Telemetry:
                </Text>
              </View>

              <GlassCard style={styles.formCard}>
                {/* Science Calculation Breakdown Card */}
                <View style={styles.breakdownBox}>
                  <View style={styles.breakdownHeaderRow}>
                    <Text style={styles.breakdownHeaderTitle}>SMART METRIC BREAKDOWN</Text>
                    {syncedSource ? (
                      <View style={styles.syncedTagBadge}>
                        <Zap size={10} color={modeColors.accent} />
                        <Text style={[styles.syncedTagText, { color: modeColors.accent }]}>
                          Synced with {syncedSource}
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.manualTagText}>Standard Metabolic Baseline</Text>
                    )}
                  </View>

                  <View style={styles.breakdownList}>
                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownItemLabel}>BMR (Mifflin-St Jeor):</Text>
                      <Text style={styles.breakdownItemVal}>{smartRecommendation.bmr} kcal</Text>
                    </View>

                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownItemLabel}>
                        {smartRecommendation.isActiveBurnFromWearable
                          ? 'Active Wearable Burn:'
                          : 'Estimated Baseline Activity:'}
                      </Text>
                      <Text style={[styles.breakdownItemVal, { color: COLORS.warning }]}>
                        +{smartRecommendation.isActiveBurnFromWearable
                          ? `${activeCalories} kcal`
                          : `${Math.round(smartRecommendation.bmr * 0.35)} kcal`}
                      </Text>
                    </View>

                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownItemLabel}>
                        Goal ({smartRecommendation.goalSummary}):
                      </Text>
                      <Text
                        style={[
                          styles.breakdownItemVal,
                          smartRecommendation.goalAdjustmentKcal < 0
                            ? { color: COLORS.strict.accent }
                            : { color: COLORS.success },
                        ]}
                      >
                        {smartRecommendation.goalAdjustmentKcal >= 0 ? '+' : ''}
                        {smartRecommendation.goalAdjustmentKcal} kcal
                      </Text>
                    </View>

                    <View style={[styles.breakdownRow, styles.breakdownRowTotal]}>
                      <Text style={styles.breakdownTotalLabel}>Calculated Target:</Text>
                      <Text style={[styles.breakdownTotalVal, { color: modeColors.accent }]}>
                        {smartRecommendation.dailyCalories} kcal / day
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Calorie Input */}
                <View style={[styles.headerWithIcon, { marginTop: SPACING.md }]}>
                  <Flame size={18} color={COLORS.warning} />
                  <Text style={styles.inputLabel}>DAILY CALORIE TARGET (KCAL)</Text>
                </View>
                <TextInput
                  style={styles.textInput}
                  keyboardType="number-pad"
                  placeholder="2400"
                  placeholderTextColor={COLORS.textMuted}
                  value={calorieTarget}
                  onChangeText={(val) => {
                    setCalorieTarget(val);
                    setHasCustomMacros(true);
                  }}
                />

                {/* Macronutrient Distribution */}
                <View style={styles.macroHeaderRow}>
                  <Text style={styles.inputLabel}>MACRONUTRIENT DISTRIBUTION</Text>
                  {hasCustomMacros && (
                    <TouchableOpacity
                      onPress={resetToAutoCalculated}
                      style={styles.resetBtn}
                      activeOpacity={0.7}
                    >
                      <RefreshCw size={11} color={modeColors.accent} />
                      <Text style={[styles.resetBtnText, { color: modeColors.accent }]}>
                        Reset to Auto
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.macroRow}>
                  <View style={styles.macroCol}>
                    <Text style={styles.macroBadge}>PROTEIN</Text>
                    <TextInput
                      style={styles.macroInput}
                      keyboardType="number-pad"
                      placeholder="165"
                      placeholderTextColor={COLORS.textMuted}
                      value={proteinGrams}
                      onChangeText={(val) => {
                        setProteinGrams(val);
                        setHasCustomMacros(true);
                      }}
                    />
                    <Text style={styles.macroUnit}>grams</Text>
                    <Text style={styles.macroKcalSub}>
                      {(parseInt(proteinGrams, 10) || 0) * 4} kcal
                    </Text>
                  </View>

                  <View style={styles.macroCol}>
                    <Text style={styles.macroBadge}>CARBS</Text>
                    <TextInput
                      style={styles.macroInput}
                      keyboardType="number-pad"
                      placeholder="260"
                      placeholderTextColor={COLORS.textMuted}
                      value={carbsGrams}
                      onChangeText={(val) => {
                        setCarbsGrams(val);
                        setHasCustomMacros(true);
                      }}
                    />
                    <Text style={styles.macroUnit}>grams</Text>
                    <Text style={styles.macroKcalSub}>
                      {(parseInt(carbsGrams, 10) || 0) * 4} kcal
                    </Text>
                  </View>

                  <View style={styles.macroCol}>
                    <Text style={styles.macroBadge}>FATS</Text>
                    <TextInput
                      style={styles.macroInput}
                      keyboardType="number-pad"
                      placeholder="55"
                      placeholderTextColor={COLORS.textMuted}
                      value={fatGrams}
                      onChangeText={(val) => {
                        setFatGrams(val);
                        setHasCustomMacros(true);
                      }}
                    />
                    <Text style={styles.macroUnit}>grams</Text>
                    <Text style={styles.macroKcalSub}>
                      {(parseInt(fatGrams, 10) || 0) * 9} kcal
                    </Text>
                  </View>
                </View>

                {/* Quick Re-sync CTA on Step 4 */}
                <TouchableOpacity
                  onPress={handleSyncFitnessApp}
                  disabled={isSyncing}
                  style={styles.reSyncBtn}
                  activeOpacity={0.75}
                >
                  <RefreshCw
                    size={12}
                    color={modeColors.accent}
                    style={isSyncing ? { transform: [{ rotate: '45deg' }] } : undefined}
                  />
                  <Text style={[styles.reSyncBtnText, { color: modeColors.accent }]}>
                    {isSyncing
                      ? 'Re-syncing Fitness App...'
                      : 'Re-sync Wearable Active Calories & Weight'}
                  </Text>
                </TouchableOpacity>
              </GlassCard>
            </View>
          )}

          {/* ===================================================================
              NAVIGATION CONTROLS
              =================================================================== */}
          <View style={styles.navRow}>
            {currentStep > 1 ? (
              <TouchableOpacity
                onPress={() => setCurrentStep((prev) => (prev - 1) as any)}
                style={styles.backBtn}
                activeOpacity={0.7}
              >
                <ArrowLeft size={16} color={COLORS.textSecondary} />
                <Text style={styles.backBtnText}>Back</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ width: 80 }} />
            )}

            {currentStep < 4 ? (
              <TouchableOpacity
                onPress={() => setCurrentStep((prev) => (prev + 1) as any)}
                disabled={!canProceed}
                style={[
                  styles.nextBtn,
                  { backgroundColor: modeColors.accent },
                  !canProceed && styles.disabledBtn,
                ]}
                activeOpacity={0.8}
              >
                <Text style={[styles.nextBtnText, !canProceed && styles.disabledBtnText]}>
                  {currentStep === 1 && !isBodyMetricsValid
                    ? 'Enter Weight & Height'
                    : currentStep === 3 && selectedGoals.length === 0
                    ? 'Select At Least 1 Goal'
                    : 'Continue'}
                </Text>
                <ArrowRight size={16} color={!canProceed ? COLORS.textMuted : COLORS.textDark} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handleFinish}
                style={[styles.nextBtn, { backgroundColor: modeColors.accent }]}
                activeOpacity={0.8}
              >
                <Text style={styles.nextBtnText}>Enter ZeroCoach</Text>
                <Sparkles size={16} color={COLORS.textDark} />
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
  },
  stepIndicatorRow: {
    flexDirection: 'row',
    gap: 8,
  },
  stepDot: {
    width: 24,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.cardSecondary,
  },
  stepDotActive: {
    width: 32,
  },
  stepDotCompleted: {},
  headerRight: {
    alignItems: 'flex-end',
  },
  stepCountText: {
    ...TYPOGRAPHY.badge,
    fontSize: 9,
    fontWeight: '800',
  },
  stepTitleSubtitle: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxxl,
  },
  stepContainer: {
    marginBottom: SPACING.lg,
  },
  titleBox: {
    marginBottom: SPACING.lg,
  },
  mainTitle: {
    ...TYPOGRAPHY.h2,
    fontSize: 22,
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  formCard: {
    padding: SPACING.lg,
  },
  providersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: SPACING.md,
  },
  providerBadge: {
    ...TYPOGRAPHY.badge,
    fontSize: 10,
    color: COLORS.textSecondary,
    backgroundColor: COLORS.cardSecondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  syncCTAButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
  syncCTAButtonText: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 14,
    color: COLORS.textDark,
  },
  syncedDetailsBox: {
    marginTop: SPACING.xs,
  },
  syncedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  syncedCheckBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.round,
  },
  syncedCheckText: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: COLORS.success,
    fontWeight: '700',
  },
  syncedTimestamp: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    color: COLORS.textMuted,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  statTile: {
    width: '48%',
    backgroundColor: COLORS.cardSecondary,
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    gap: 2,
  },
  statLabel: {
    ...TYPOGRAPHY.badge,
    fontSize: 9,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  statValue: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  metricsSummaryRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  metricPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.cardSecondary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  metricPillText: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  inputLabel: {
    ...TYPOGRAPHY.badge,
    fontSize: 10,
    color: COLORS.textMuted,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: COLORS.cardSecondary,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    color: COLORS.textPrimary,
    ...TYPOGRAPHY.body,
    fontSize: 14,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  halfInput: {
    flex: 1,
  },
  syncedMiniTag: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
  },
  syncedMiniText: {
    ...TYPOGRAPHY.caption,
    fontSize: 8,
    color: COLORS.success,
    fontWeight: '800',
  },
  modeCard: {
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  modeCardSelected: {
    backgroundColor: COLORS.surfaceElevated,
  },
  modeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  modeIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modeTitle: {
    ...TYPOGRAPHY.h3,
    fontSize: 15,
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeDescription: {
    ...TYPOGRAPHY.body,
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: SPACING.sm,
  },
  bulletList: {
    gap: 4,
  },
  bullet: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: COLORS.textMuted,
  },
  goalsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.lg,
    marginBottom: 6,
  },
  goalsCountBadge: {
    ...TYPOGRAPHY.badge,
    fontSize: 10,
    fontWeight: '800',
  },
  goalsWrap: {
    gap: SPACING.sm,
  },
  goalCard: {
    backgroundColor: COLORS.cardSecondary,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  goalCardSelected: {
    borderWidth: 1.5,
  },
  goalCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  goalLabelText: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  goalCheckbox: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    backgroundColor: COLORS.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalDescText: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: COLORS.textSecondary,
    lineHeight: 15,
  },
  breakdownBox: {
    backgroundColor: COLORS.cardSecondary,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  breakdownHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  breakdownHeaderTitle: {
    ...TYPOGRAPHY.badge,
    fontSize: 9,
    color: COLORS.textMuted,
  },
  syncedTagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  syncedTagText: {
    ...TYPOGRAPHY.caption,
    fontSize: 9,
    fontWeight: '700',
  },
  manualTagText: {
    ...TYPOGRAPHY.caption,
    fontSize: 9,
    color: COLORS.textMuted,
  },
  breakdownList: {
    gap: 6,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownRowTotal: {
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSubtle,
    paddingTop: 6,
    marginTop: 2,
  },
  breakdownItemLabel: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  breakdownItemVal: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  breakdownTotalLabel: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 12,
    color: COLORS.textPrimary,
  },
  breakdownTotalVal: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 13,
    fontWeight: '800',
  },
  headerWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  macroHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.md,
    marginBottom: 6,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  resetBtnText: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    fontWeight: '700',
  },
  macroRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  macroCol: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: COLORS.cardSecondary,
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  macroBadge: {
    ...TYPOGRAPHY.badge,
    fontSize: 9,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  macroInput: {
    ...TYPOGRAPHY.metricMedium,
    fontSize: 19,
    color: COLORS.textPrimary,
    textAlign: 'center',
    padding: 0,
    margin: 0,
  },
  macroUnit: {
    ...TYPOGRAPHY.caption,
    fontSize: 9,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  macroKcalSub: {
    ...TYPOGRAPHY.caption,
    fontSize: 8,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  reSyncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: SPACING.md,
    paddingVertical: 8,
  },
  reSyncBtnText: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    fontWeight: '700',
  },
  telemetryToggleRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.cardSecondary,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  toggleBtnActive: {
    backgroundColor: COLORS.surfaceElevated,
  },
  toggleBtnText: {
    ...TYPOGRAPHY.caption,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  noAppInfoBox: {
    flexDirection: 'row',
    gap: SPACING.md,
    backgroundColor: COLORS.cardSecondary,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  noAppTitle: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 13,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  noAppDesc: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  readinessPreviewBox: {
    marginTop: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.cardSecondary,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  previewTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewTitle: {
    ...TYPOGRAPHY.badge,
    fontSize: 9,
    color: COLORS.textMuted,
  },
  previewScore: {
    ...TYPOGRAPHY.h3,
    fontSize: 20,
    fontWeight: '900',
  },
  previewCategory: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 13,
    marginTop: 2,
  },
  previewGuidance: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  syncCardContent: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    gap: SPACING.sm,
  },
  syncCardTitle: {
    ...TYPOGRAPHY.h3,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  syncCardDesc: {
    ...TYPOGRAPHY.body,
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: SPACING.md,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: SPACING.md,
  },
  backBtnText: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.xl,
    paddingVertical: 12,
    borderRadius: RADIUS.round,
  },
  nextBtnText: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 14,
    color: COLORS.textDark,
  },
  disabledBtn: {
    opacity: 0.5,
    backgroundColor: COLORS.cardSecondary,
  },
  disabledBtnText: {
    color: COLORS.textMuted,
  },
  syncErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    marginTop: SPACING.sm,
  },
  syncErrorText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.danger,
    flex: 1,
  },
  segmentedSelectorRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  segmentedSelectorOption: {
    flex: 1,
    backgroundColor: COLORS.cardSecondary,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: RADIUS.sm,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  segmentedSelectorText: {
    ...TYPOGRAPHY.captionBold,
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  segmentedSelectorSub: {
    ...TYPOGRAPHY.caption,
    fontSize: 9,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
});
