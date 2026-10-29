import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { COLORS, getModeColors } from '@/theme/colors';
import { SPACING, RADIUS } from '@/theme/spacing';
import { TYPOGRAPHY } from '@/theme/typography';
import { GlassCard } from '@/components/common/GlassCard';
import { ExerciseItem, GeneratedWorkoutPlan } from '@/types/workout';
import { useTranslation } from '@/i18n';
import {
  Trophy,
  CheckCircle2,
  Clock,
  Flame,
  Dumbbell,
  Layers,
  X,
  Sparkles,
  ArrowRight,
} from 'lucide-react-native';

interface WorkoutSummaryModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirmFinish: (summary: {
    durationMinutes: number;
    caloriesBurned: number;
    notes?: string;
  }) => void;
  plan: GeneratedWorkoutPlan;
  completedExercises: ExerciseItem[];
  skippedExercises: ExerciseItem[];
  initialDurationMin: number;
  initialCaloriesBurn: number;
}

export const WorkoutSummaryModal: React.FC<WorkoutSummaryModalProps> = ({
  visible,
  onClose,
  onConfirmFinish,
  plan,
  completedExercises,
  skippedExercises,
  initialDurationMin,
  initialCaloriesBurn,
}) => {
  const { t, language } = useTranslation();
  const modeColors = getModeColors();
  const [durationMinutes, setDurationMinutes] = useState(
    String(Math.max(1, initialDurationMin))
  );
  const [caloriesBurned, setCaloriesBurned] = useState(
    String(Math.max(10, initialCaloriesBurn))
  );
  const [userNotes, setUserNotes] = useState('');

  // Total completed sets across all finished movements
  const totalSets = completedExercises.reduce((acc, ex) => acc + ex.targetSets, 0);

  const handleSave = () => {
    const dur = parseInt(durationMinutes, 10) || initialDurationMin || 30;
    const cal = parseInt(caloriesBurned, 10) || initialCaloriesBurn || 200;
    onConfirmFinish({
      durationMinutes: dur,
      caloriesBurned: cal,
      notes: userNotes.trim() ? userNotes.trim() : undefined,
    });
  };

  const coachMessage =
    language === 'th'
      ? 'การฝึกได้รับการบันทึกเรียบร้อย เกิดความตึงเครียดทางกล้ามเนื้อตามโปรโตคอล ดื่มน้ำให้เพียงพอ พักผ่อนให้มีคุณภาพ และเติมสารอาหารโปรตีนตามเป้าหมาย'
      : 'Execution recorded. High mechanical tension registered per protocol. Hydrate, prioritize recovery sleep, and hit your protein target.';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <View style={styles.sheetContainer}>
          <GlassCard
            glowColor={`${modeColors.accent}35`}
            borderColor={`${modeColors.accent}50`}
            style={styles.card}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <View
                  style={[
                    styles.trophyCircle,
                    { backgroundColor: `${modeColors.accent}20` },
                  ]}
                >
                  <Trophy size={20} color={modeColors.accent} />
                </View>
                <View>
                  <Text style={styles.subTitle}>{t.workout.summaryModal.title}</Text>
                  <Text style={styles.title}>{plan.title}</Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={onClose}
                style={styles.closeBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              {/* Stat Grid (2x2) */}
              <View style={styles.statsGrid}>
                {/* Duration */}
                <View style={styles.statBox}>
                  <View style={styles.statLabelRow}>
                    <Clock size={12} color={COLORS.textMuted} />
                    <Text style={styles.statLabel}>{t.workout.summaryModal.duration}</Text>
                  </View>
                  <TextInput
                    style={[styles.statInput, { color: modeColors.accent }]}
                    value={durationMinutes}
                    onChangeText={setDurationMinutes}
                    keyboardType="number-pad"
                    maxLength={3}
                  />
                </View>

                {/* Calories */}
                <View style={styles.statBox}>
                  <View style={styles.statLabelRow}>
                    <Flame size={12} color={COLORS.warning} />
                    <Text style={styles.statLabel}>{t.workout.summaryModal.calories}</Text>
                  </View>
                  <TextInput
                    style={[styles.statInput, { color: COLORS.warning }]}
                    value={caloriesBurned}
                    onChangeText={setCaloriesBurned}
                    keyboardType="number-pad"
                    maxLength={4}
                  />
                </View>

                {/* Movements */}
                <View style={styles.statBox}>
                  <View style={styles.statLabelRow}>
                    <Dumbbell size={12} color={COLORS.success} />
                    <Text style={styles.statLabel}>{t.workout.summaryModal.movements}</Text>
                  </View>
                  <Text style={[styles.statStaticVal, { color: COLORS.success }]}>
                    {completedExercises.length} / {plan.exercises.length}
                  </Text>
                </View>

                {/* Total Sets */}
                <View style={styles.statBox}>
                  <View style={styles.statLabelRow}>
                    <Layers size={12} color={COLORS.purpleAccent} />
                    <Text style={styles.statLabel}>{t.workout.summaryModal.totalSets}</Text>
                  </View>
                  <Text style={[styles.statStaticVal, { color: COLORS.purpleAccent }]}>
                    {totalSets} {t.common.sets}
                  </Text>
                </View>
              </View>

              {/* Coach Evaluation Snippet */}
              <View
                style={[
                  styles.coachSnippetCard,
                  { borderColor: `${modeColors.accent}30` },
                ]}
              >
                <View style={styles.coachSnippetHeader}>
                  <Sparkles size={13} color={modeColors.accent} />
                  <Text
                    style={[
                      styles.coachSnippetTitle,
                      { color: modeColors.accent },
                    ]}
                  >
                    {t.workout.summaryModal.coachDebrief}
                  </Text>
                </View>
                <Text style={styles.coachSnippetText}>{coachMessage}</Text>
              </View>

              {/* Completed Exercises Summary */}
              <View style={styles.completedSection}>
                <Text style={styles.sectionHeader}>{t.workout.summaryModal.loggedMovements}</Text>
                {completedExercises.map((ex) => (
                  <View key={ex.id} style={styles.exerciseRow}>
                    <CheckCircle2 size={15} color={COLORS.success} />
                    <Text style={styles.exerciseName} numberOfLines={1}>
                      {ex.name}
                    </Text>
                    <Text style={styles.exerciseSets}>
                      {ex.targetSets} {t.common.sets} × {ex.targetReps}
                    </Text>
                  </View>
                ))}

                {skippedExercises.length > 0 && (
                  <>
                    <Text style={[styles.sectionHeader, { marginTop: SPACING.md }]}>
                      {t.workout.summaryModal.skipped} ({skippedExercises.length})
                    </Text>
                    {skippedExercises.map((ex) => (
                      <View key={ex.id} style={[styles.exerciseRow, { opacity: 0.5 }]}>
                        <X size={14} color={COLORS.textMuted} />
                        <Text style={[styles.exerciseName, { textDecorationLine: 'line-through' }]}>
                          {ex.name}
                        </Text>
                      </View>
                    ))}
                  </>
                )}
              </View>

              {/* User Notes Input */}
              <View style={styles.notesSection}>
                <Text style={styles.sectionHeader}>{t.workout.summaryModal.sessionNotes}</Text>
                <TextInput
                  style={styles.notesInput}
                  placeholder={t.workout.summaryModal.notesPlaceholder}
                  placeholderTextColor={COLORS.textMuted}
                  value={userNotes}
                  onChangeText={setUserNotes}
                  multiline
                  maxLength={200}
                />
              </View>
            </ScrollView>

            {/* Actions */}
            <View style={styles.actionsRow}>
              <TouchableOpacity
                onPress={onClose}
                style={styles.cancelBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelBtnText}>{t.common.back}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSave}
                style={[styles.saveBtn, { backgroundColor: modeColors.accent }]}
                activeOpacity={0.85}
              >
                <CheckCircle2 size={16} color={COLORS.background} />
                <Text style={styles.saveBtnText}>{t.workout.summaryModal.finishAndSave}</Text>
                <ArrowRight size={14} color={COLORS.background} />
              </TouchableOpacity>
            </View>
          </GlassCard>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.md,
  },
  sheetContainer: {
    width: '100%',
    maxHeight: '90%',
  },
  card: {
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    maxHeight: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
  },
  trophyCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subTitle: {
    ...TYPOGRAPHY.badge,
    color: COLORS.textMuted,
    fontSize: 9,
    letterSpacing: 1,
  },
  title: {
    ...TYPOGRAPHY.subtitle,
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 6,
    borderRadius: RADIUS.round,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  scrollContent: {
    paddingBottom: SPACING.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  statBox: {
    flex: 1,
    minWidth: '46%',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: SPACING.sm,
  },
  statLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  statLabel: {
    ...TYPOGRAPHY.badge,
    color: COLORS.textMuted,
    fontSize: 9,
  },
  statInput: {
    ...TYPOGRAPHY.subtitle,
    fontSize: 18,
    fontWeight: '800',
    paddingVertical: 2,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  statStaticVal: {
    ...TYPOGRAPHY.subtitle,
    fontSize: 18,
    fontWeight: '800',
    paddingVertical: 2,
  },
  coachSnippetCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: SPACING.sm + 2,
    marginBottom: SPACING.md,
  },
  coachSnippetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  coachSnippetTitle: {
    ...TYPOGRAPHY.badge,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  coachSnippetText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  sectionHeader: {
    ...TYPOGRAPHY.badge,
    color: COLORS.textMuted,
    fontSize: 10,
    letterSpacing: 0.8,
    marginBottom: SPACING.xs + 2,
  },
  completedSection: {
    marginBottom: SPACING.md,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs + 2,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  exerciseName: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textPrimary,
    flex: 1,
    fontWeight: '600',
    fontSize: 12,
  },
  exerciseSets: {
    ...TYPOGRAPHY.badge,
    color: COLORS.textMuted,
    fontSize: 10,
  },
  notesSection: {
    marginBottom: SPACING.sm,
  },
  notesInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: SPACING.sm,
    color: COLORS.textPrimary,
    fontSize: 12,
    minHeight: 50,
    textAlignVertical: 'top',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: SPACING.md,
  },
  cancelBtn: {
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    ...TYPOGRAPHY.button,
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs + 2,
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
  },
  saveBtnText: {
    ...TYPOGRAPHY.button,
    color: COLORS.background,
    fontSize: 12,
    fontWeight: '800',
  },
});
