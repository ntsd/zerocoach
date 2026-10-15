import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCoachStore } from '@/store/useCoachStore';
import { useTelemetryStore } from '@/store/useTelemetryStore';
import { CoachingMode, UserProfile, TrainingGoal } from '@/types/coach';
import { calculateReadinessScore, getReadinessCategory } from '@/services/telemetry/readinessCalculator';
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
  Edit3,
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

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Mode
  const [selectedMode, setSelectedMode] = useState<CoachingMode>('strict');

  // Step 2: Profile
  const [name, setName] = useState('');
  const [weightKg, setWeightKg] = useState('74');
  const [heightCm, setHeightCm] = useState('178');
  const [selectedGoals, setSelectedGoals] = useState<TrainingGoal[]>([
    'calisthenics_mastery',
    'strength_hypertrophy',
  ]);

  // Step 3: Nutrition
  const [calorieTarget, setCalorieTarget] = useState('2800');
  const [proteinGrams, setProteinGrams] = useState('170');
  const [carbsGrams, setCarbsGrams] = useState('320');
  const [fatGrams, setFatGrams] = useState('65');

  // Step 4: Telemetry Mode
  const [telemetryChoice, setTelemetryChoice] = useState<'manual' | 'sync'>('manual');
  const [sleepHours, setSleepHours] = useState('7.5');
  const [sleepQuality, setSleepQuality] = useState('80');
  const [restingHeartRate, setRestingHeartRate] = useState('54');
  const [steps, setSteps] = useState('8500');
  const [activeCalories, setActiveCalories] = useState('550');

  const modeColors = getModeColors(selectedMode);

  // Preview readiness calculation
  const previewReadiness = calculateReadinessScore({
    sleepHours: parseFloat(sleepHours) || 7.5,
    sleepQualityScore: parseInt(sleepQuality, 10) || 80,
    restingHeartRate: parseInt(restingHeartRate, 10) || 54,
    heartRateVariability: 60,
  });
  const readinessCategory = getReadinessCategory(previewReadiness);

  const toggleGoal = (goalId: TrainingGoal) => {
    setSelectedGoals((prev) => {
      if (prev.includes(goalId)) {
        if (prev.length <= 1) return prev; // keep at least 1 selected
        return prev.filter((g) => g !== goalId);
      }
      return [...prev, goalId];
    });
  };

  const handleFinish = () => {
    const profile: UserProfile = {
      name: name.trim() || 'Athlete',
      weightKg: parseFloat(weightKg) || 74,
      heightCm: parseFloat(heightCm) || 178,
      dailyCalorieTarget: parseInt(calorieTarget, 10) || 2800,
      proteinGrams: parseInt(proteinGrams, 10) || 170,
      carbsGrams: parseInt(carbsGrams, 10) || 320,
      fatGrams: parseInt(fatGrams, 10) || 65,
      primaryGoals: selectedGoals,
    };

    // Save manual telemetry entered during onboarding
    setManualTelemetry({
      sleepHours: parseFloat(sleepHours) || 7.5,
      sleepQualityScore: parseInt(sleepQuality, 10) || 80,
      restingHeartRate: parseInt(restingHeartRate, 10) || 54,
      heartRateVariability: 60,
      steps: parseInt(steps, 10) || 8500,
      activeCalories: parseInt(activeCalories, 10) || 550,
    });

    completeOnboarding(profile, selectedMode);
    onComplete();
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
          <Text style={[styles.stepCountText, { color: modeColors.accent }]}>
            STEP {currentStep} OF 4
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* STEP 1: COACHING MODE */}
          {currentStep === 1 && (
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
                    Compassionate lifestyle guide. Emphasizes consistency over intensity, gentle habit building, joint longevity, and sustainable progress.
                  </Text>
                  <View style={styles.bulletList}>
                    <Text style={styles.bullet}>• Accessible exercise regressions & pain-free holds</Text>
                    <Text style={styles.bullet}>• Intuitive nourishment without obsessive counting</Text>
                    <Text style={styles.bullet}>• Encourages micro-wins and nervous system rest</Text>
                  </View>
                </GlassCard>
              </TouchableOpacity>
            </View>
          )}

          {/* STEP 2: PROFILE & BIOMETRICS */}
          {currentStep === 2 && (
            <View style={styles.stepContainer}>
              <View style={styles.titleBox}>
                <Text style={styles.mainTitle}>Your Profile & Goals</Text>
                <Text style={styles.subtitle}>
                  Enter your stats so the on-device model can personalize training volume and bodyweight leverage:
                </Text>
              </View>

              <GlassCard style={styles.formCard}>
                <Text style={styles.inputLabel}>WHAT SHOULD THE COACH CALL YOU?</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Alex"
                  placeholderTextColor={COLORS.textMuted}
                  value={name}
                  onChangeText={setName}
                />

                <View style={styles.rowInputs}>
                  <View style={styles.halfInput}>
                    <Text style={styles.inputLabel}>BODY WEIGHT (KG)</Text>
                    <TextInput
                      style={styles.textInput}
                      keyboardType="decimal-pad"
                      placeholder="74"
                      placeholderTextColor={COLORS.textMuted}
                      value={weightKg}
                      onChangeText={setWeightKg}
                    />
                  </View>
                  <View style={styles.halfInput}>
                    <Text style={styles.inputLabel}>HEIGHT (CM)</Text>
                    <TextInput
                      style={styles.textInput}
                      keyboardType="number-pad"
                      placeholder="178"
                      placeholderTextColor={COLORS.textMuted}
                      value={heightCm}
                      onChangeText={setHeightCm}
                    />
                  </View>
                </View>

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

          {/* STEP 3: NUTRITION TARGETS */}
          {currentStep === 3 && (
            <View style={styles.stepContainer}>
              <View style={styles.titleBox}>
                <Text style={styles.mainTitle}>Daily Nutrition Baseline</Text>
                <Text style={styles.subtitle}>
                  Set your daily nutritional foundation. The coach dynamically adjusts these macros based on your active burn:
                </Text>
              </View>

              <GlassCard style={styles.formCard}>
                <View style={styles.headerWithIcon}>
                  <Flame size={18} color={COLORS.warning} />
                  <Text style={styles.inputLabel}>DAILY CALORIE BASELINE (KCAL)</Text>
                </View>
                <TextInput
                  style={styles.textInput}
                  keyboardType="number-pad"
                  placeholder="2800"
                  placeholderTextColor={COLORS.textMuted}
                  value={calorieTarget}
                  onChangeText={setCalorieTarget}
                />

                <Text style={[styles.inputLabel, { marginTop: SPACING.md }]}>
                  MACRONUTRIENT DISTRIBUTION
                </Text>
                <View style={styles.macroRow}>
                  <View style={styles.macroCol}>
                    <Text style={styles.macroBadge}>PROTEIN</Text>
                    <TextInput
                      style={styles.macroInput}
                      keyboardType="number-pad"
                      placeholder="170"
                      placeholderTextColor={COLORS.textMuted}
                      value={proteinGrams}
                      onChangeText={setProteinGrams}
                    />
                    <Text style={styles.macroUnit}>grams</Text>
                  </View>

                  <View style={styles.macroCol}>
                    <Text style={styles.macroBadge}>CARBS</Text>
                    <TextInput
                      style={styles.macroInput}
                      keyboardType="number-pad"
                      placeholder="320"
                      placeholderTextColor={COLORS.textMuted}
                      value={carbsGrams}
                      onChangeText={setCarbsGrams}
                    />
                    <Text style={styles.macroUnit}>grams</Text>
                  </View>

                  <View style={styles.macroCol}>
                    <Text style={styles.macroBadge}>FATS</Text>
                    <TextInput
                      style={styles.macroInput}
                      keyboardType="number-pad"
                      placeholder="65"
                      placeholderTextColor={COLORS.textMuted}
                      value={fatGrams}
                      onChangeText={setFatGrams}
                    />
                    <Text style={styles.macroUnit}>grams</Text>
                  </View>
                </View>
              </GlassCard>
            </View>
          )}

          {/* STEP 4: WEARABLE & MANUAL TELEMETRY INPUT */}
          {currentStep === 4 && (
            <View style={styles.stepContainer}>
              <View style={styles.titleBox}>
                <Text style={styles.mainTitle}>Fitness Telemetry Setup</Text>
                <Text style={styles.subtitle}>
                  If you have a fitness app (Google Fit, Garmin, Xiaomi), you can sync it. If not, enter your metrics manually below:
                </Text>
              </View>

              {/* Toggle Choice */}
              <View style={styles.telemetryToggleRow}>
                <TouchableOpacity
                  onPress={() => setTelemetryChoice('manual')}
                  style={[
                    styles.toggleBtn,
                    telemetryChoice === 'manual' && styles.toggleBtnActive,
                    telemetryChoice === 'manual' && { borderColor: modeColors.accent },
                  ]}
                  activeOpacity={0.8}
                >
                  <Edit3 size={16} color={telemetryChoice === 'manual' ? modeColors.accent : COLORS.textMuted} />
                  <Text
                    style={[
                      styles.toggleBtnText,
                      telemetryChoice === 'manual' && { color: modeColors.accent, fontWeight: '700' },
                    ]}
                  >
                    Manual Input (No App)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setTelemetryChoice('sync')}
                  style={[
                    styles.toggleBtn,
                    telemetryChoice === 'sync' && styles.toggleBtnActive,
                    telemetryChoice === 'sync' && { borderColor: modeColors.accent },
                  ]}
                  activeOpacity={0.8}
                >
                  <Watch size={16} color={telemetryChoice === 'sync' ? modeColors.accent : COLORS.textMuted} />
                  <Text
                    style={[
                      styles.toggleBtnText,
                      telemetryChoice === 'sync' && { color: modeColors.accent, fontWeight: '700' },
                    ]}
                  >
                    Fitness App Sync
                  </Text>
                </TouchableOpacity>
              </View>

              {telemetryChoice === 'manual' ? (
                <GlassCard style={styles.formCard}>
                  <Text style={styles.sectionSubtitle}>
                    Enter your recent physiological metrics:
                  </Text>

                  {/* Sleep & Quality */}
                  <View style={styles.rowInputs}>
                    <View style={styles.halfInput}>
                      <View style={styles.labelRow}>
                        <Moon size={13} color={COLORS.purpleAccent} />
                        <Text style={styles.inputLabel}>SLEEP (HOURS)</Text>
                      </View>
                      <TextInput
                        style={styles.textInput}
                        keyboardType="decimal-pad"
                        placeholder="7.5"
                        placeholderTextColor={COLORS.textMuted}
                        value={sleepHours}
                        onChangeText={setSleepHours}
                      />
                    </View>

                    <View style={styles.halfInput}>
                      <View style={styles.labelRow}>
                        <Sparkles size={13} color={COLORS.warning} />
                        <Text style={styles.inputLabel}>SLEEP QUALITY (0-100)</Text>
                      </View>
                      <TextInput
                        style={styles.textInput}
                        keyboardType="number-pad"
                        placeholder="80"
                        placeholderTextColor={COLORS.textMuted}
                        value={sleepQuality}
                        onChangeText={setSleepQuality}
                      />
                    </View>
                  </View>

                  {/* Heart Rate & Steps */}
                  <View style={[styles.rowInputs, { marginTop: SPACING.sm }]}>
                    <View style={styles.halfInput}>
                      <View style={styles.labelRow}>
                        <Heart size={13} color={COLORS.danger} />
                        <Text style={styles.inputLabel}>RESTING HR (BPM)</Text>
                      </View>
                      <TextInput
                        style={styles.textInput}
                        keyboardType="number-pad"
                        placeholder="54"
                        placeholderTextColor={COLORS.textMuted}
                        value={restingHeartRate}
                        onChangeText={setRestingHeartRate}
                      />
                    </View>

                    <View style={styles.halfInput}>
                      <View style={styles.labelRow}>
                        <Footprints size={13} color={COLORS.strict.accent} />
                        <Text style={styles.inputLabel}>TODAY'S STEPS</Text>
                      </View>
                      <TextInput
                        style={styles.textInput}
                        keyboardType="number-pad"
                        placeholder="8500"
                        placeholderTextColor={COLORS.textMuted}
                        value={steps}
                        onChangeText={setSteps}
                      />
                    </View>
                  </View>

                  {/* Active Calories */}
                  <View style={{ marginTop: SPACING.sm }}>
                    <View style={styles.labelRow}>
                      <Flame size={13} color={COLORS.warning} />
                      <Text style={styles.inputLabel}>ACTIVE CALORIES BURNED (KCAL)</Text>
                    </View>
                    <TextInput
                      style={styles.textInput}
                      keyboardType="number-pad"
                      placeholder="550"
                      placeholderTextColor={COLORS.textMuted}
                      value={activeCalories}
                      onChangeText={setActiveCalories}
                    />
                  </View>

                  {/* Dynamic Readiness Preview */}
                  <View style={styles.readinessPreviewBox}>
                    <View style={styles.previewTop}>
                      <Text style={styles.previewTitle}>CALCULATED READINESS SCORE</Text>
                      <Text style={[styles.previewScore, { color: readinessCategory.color }]}>
                        {previewReadiness}/100
                      </Text>
                    </View>
                    <Text style={[styles.previewCategory, { color: readinessCategory.color }]}>
                      {readinessCategory.label}
                    </Text>
                    <Text style={styles.previewGuidance}>{readinessCategory.guidance}</Text>
                  </View>
                </GlassCard>
              ) : (
                <GlassCard style={styles.formCard}>
                  <View style={styles.syncCardContent}>
                    <Watch size={32} color={modeColors.accent} />
                    <Text style={styles.syncCardTitle}>Local Wearable Bridges Active</Text>
                    <Text style={styles.syncCardDesc}>
                      ZeroCoach pulls locally from Android Health Connect (Google Fit, Garmin, Xiaomi) on-device. No cloud APIs or logins required.
                    </Text>
                    <View style={styles.syncStatusTag}>
                      <Text style={styles.syncStatusText}>Ready to Sync on Main Dashboard</Text>
                    </View>
                  </View>
                </GlassCard>
              )}
            </View>
          )}

          {/* Navigation Controls */}
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
            ) : <View style={{ width: 80 }} />}

            {currentStep < 4 ? (
              <TouchableOpacity
                onPress={() => setCurrentStep((prev) => (prev + 1) as any)}
                style={[styles.nextBtn, { backgroundColor: modeColors.accent }]}
                activeOpacity={0.8}
              >
                <Text style={styles.nextBtnText}>Continue</Text>
                <ArrowRight size={16} color={COLORS.textDark} />
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
  stepCountText: {
    ...TYPOGRAPHY.badge,
    fontSize: 10,
    fontWeight: '800',
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
  modeCard: {
    marginBottom: SPACING.md,
    padding: SPACING.lg,
  },
  modeCardSelected: {
    borderWidth: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  modeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modeIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modeTitle: {
    ...TYPOGRAPHY.h3,
    fontSize: 15,
    fontWeight: '800',
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
    color: COLORS.textPrimary,
    lineHeight: 18,
    marginBottom: SPACING.sm,
  },
  bulletList: {
    gap: 3,
  },
  bullet: {
    ...TYPOGRAPHY.caption,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  formCard: {
    padding: SPACING.lg,
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
    ...TYPOGRAPHY.body,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.md,
  },
  halfInput: {
    flex: 1,
  },
  goalsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.md,
    marginBottom: 6,
  },
  goalsCountBadge: {
    ...TYPOGRAPHY.badge,
    fontSize: 9,
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
  headerWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
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
    fontSize: 20,
    color: COLORS.textPrimary,
    textAlign: 'center',
    padding: 0,
    margin: 0,
  },
  macroUnit: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 2,
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
  sectionSubtitle: {
    ...TYPOGRAPHY.body,
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
  syncStatusTag: {
    marginTop: SPACING.sm,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.round,
  },
  syncStatusText: {
    ...TYPOGRAPHY.badge,
    fontSize: 10,
    color: COLORS.success,
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
});
