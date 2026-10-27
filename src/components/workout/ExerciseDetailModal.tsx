import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { AppModal } from '@/components/common/AppModal';
import { ExerciseItem } from '@/types/workout';
import { CoachingMode } from '@/types/coach';
import { COLORS, getModeColors } from '@/theme/colors';
import { RADIUS, SPACING } from '@/theme/spacing';
import { TYPOGRAPHY } from '@/theme/typography';
import { useTranslation } from '@/i18n';
import {
  Dumbbell,
  Clock,
  Layers,
  Zap,
  CheckCircle2,
  Circle,
  Sparkles,
  Play,
  RotateCcw,
  ShieldCheck,
  Flame,
  Minus,
  Plus,
} from 'lucide-react-native';

interface ExerciseDetailModalProps {
  visible: boolean;
  exercise: ExerciseItem | null;
  isCompleted?: boolean;
  onToggleComplete?: () => void;
  onUpdateSets?: (newSets: number) => void;
  onUpdateReps?: (newReps: string) => void;
  onClose: () => void;
  onAskCoach?: (exerciseName: string) => void;
  mode: CoachingMode;
}

export const ExerciseDetailModal: React.FC<ExerciseDetailModalProps> = ({
  visible,
  exercise,
  isCompleted = false,
  onToggleComplete,
  onUpdateSets,
  onUpdateReps,
  onClose,
  onAskCoach,
  mode,
}) => {
  const { t } = useTranslation();
  const [activePose, setActivePose] = useState<'start' | 'peak'>('peak');
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  const modeColors = getModeColors(mode);

  // Auto-play loop between Start and Peak poses if both exist
  useEffect(() => {
    if (!visible || !isAutoPlaying || !exercise?.imageStartUrl || !exercise?.imagePeakUrl) {
      return;
    }

    const interval = setInterval(() => {
      setActivePose((prev) => (prev === 'start' ? 'peak' : 'start'));
    }, 1200);

    return () => clearInterval(interval);
  }, [visible, isAutoPlaying, exercise?.imageStartUrl, exercise?.imagePeakUrl]);

  // Reset state when exercise changes
  useEffect(() => {
    if (visible) {
      setActivePose('peak');
      setImageLoading(true);
      setImageError(false);
      setIsAutoPlaying(false);
    }
  }, [visible, exercise?.id]);

  if (!exercise) return null;

  const hasBothPoses = Boolean(exercise.imageStartUrl && exercise.imagePeakUrl);
  const currentImageUrl =
    hasBothPoses && activePose === 'start'
      ? exercise.imageStartUrl
      : exercise.imagePeakUrl || exercise.imageUrl || exercise.imageStartUrl;

  return (
    <AppModal
      visible={visible}
      onClose={onClose}
      title={exercise.name}
      icon={Dumbbell}
      iconColor={modeColors.accent}
      height="88%"
      footer={
        <View style={styles.footerRow}>
          {onToggleComplete && (
            <TouchableOpacity
              onPress={onToggleComplete}
              style={[
                styles.completeBtn,
                isCompleted ? styles.completeBtnDone : styles.completeBtnPending,
                { borderColor: isCompleted ? COLORS.success : 'rgba(255, 255, 255, 0.15)' },
              ]}
              activeOpacity={0.8}
            >
              {isCompleted ? (
                <CheckCircle2 size={16} color={COLORS.success} />
              ) : (
                <Circle size={16} color={COLORS.textSecondary} />
              )}
              <Text
                style={[
                  styles.completeBtnText,
                  { color: isCompleted ? COLORS.success : COLORS.textPrimary },
                ]}
              >
                {isCompleted ? t.workout.detailModal.completed : t.workout.detailModal.markDone}
              </Text>
            </TouchableOpacity>
          )}

          {onAskCoach && (
            <TouchableOpacity
              onPress={() => {
                onClose();
                onAskCoach(exercise.name);
              }}
              style={[styles.askCoachBtn, { backgroundColor: modeColors.accent }]}
              activeOpacity={0.85}
            >
              <Sparkles size={16} color={COLORS.textDark} />
              <Text style={styles.askCoachBtnText}>{t.workout.detailModal.askCoachCues}</Text>
            </TouchableOpacity>
          )}
        </View>
      }
    >
      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Visual Preview Container */}
        <View style={styles.previewContainer}>
          {currentImageUrl && !imageError ? (
            <View style={styles.imageWrapper}>
              <Image
                source={{ uri: currentImageUrl }}
                style={styles.exerciseImage}
                resizeMode="contain"
                onLoadStart={() => setImageLoading(true)}
                onLoadEnd={() => setImageLoading(false)}
                onError={() => {
                  setImageLoading(false);
                  setImageError(true);
                }}
              />
              {imageLoading && (
                <View style={styles.imageLoadingOverlay}>
                  <ActivityIndicator size="small" color={modeColors.accent} />
                </View>
              )}
            </View>
          ) : (
            <View style={styles.fallbackBox}>
              <Dumbbell size={40} color={COLORS.textMuted} />
              <Text style={styles.fallbackText}>{t.workout.detailModal.repDbMovement}</Text>
            </View>
          )}

          {/* Start / Peak Pose Selector & Auto-Loop Controls */}
          {hasBothPoses && (
            <View style={styles.poseControlRow}>
              <View style={styles.poseToggleGroup}>
                <TouchableOpacity
                  onPress={() => {
                    setIsAutoPlaying(false);
                    setActivePose('start');
                  }}
                  style={[
                    styles.poseBtn,
                    activePose === 'start' && {
                      backgroundColor: `${modeColors.accent}25`,
                      borderColor: modeColors.accent,
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.poseBtnText,
                      activePose === 'start' && { color: modeColors.accent, fontWeight: '800' },
                    ]}
                  >
                    {t.workout.detailModal.startPose}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setIsAutoPlaying(false);
                    setActivePose('peak');
                  }}
                  style={[
                    styles.poseBtn,
                    activePose === 'peak' && {
                      backgroundColor: `${modeColors.accent}25`,
                      borderColor: modeColors.accent,
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.poseBtnText,
                      activePose === 'peak' && { color: modeColors.accent, fontWeight: '800' },
                    ]}
                  >
                    {t.workout.detailModal.peakContraction}
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={() => setIsAutoPlaying((prev) => !prev)}
                style={[
                  styles.autoPlayBtn,
                  isAutoPlaying && {
                    backgroundColor: modeColors.accent,
                    borderColor: modeColors.accent,
                  },
                ]}
                activeOpacity={0.7}
              >
                <RotateCcw
                  size={12}
                  color={isAutoPlaying ? COLORS.textDark : COLORS.textSecondary}
                />
                <Text
                  style={[
                    styles.autoPlayBtnText,
                    isAutoPlaying && { color: COLORS.textDark, fontWeight: '800' },
                  ]}
                >
                  {isAutoPlaying ? t.workout.detailModal.looping : t.workout.detailModal.autoLoop}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Prescription Card (Sets, Reps, Rest, Energy) */}
        <View style={styles.prescriptionCard}>
          <View style={styles.prescItem}>
            <Text style={styles.prescLabel}>{t.workout.detailModal.sets}</Text>
            {onUpdateSets ? (
              <View style={styles.modalSetControls}>
                <TouchableOpacity
                  onPress={() => onUpdateSets(Math.max(1, exercise.targetSets - 1))}
                  disabled={exercise.targetSets <= 1}
                  style={[
                    styles.modalStepBtn,
                    exercise.targetSets <= 1 && styles.modalStepBtnDisabled,
                  ]}
                  activeOpacity={0.7}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Minus
                    size={11}
                    color={exercise.targetSets <= 1 ? 'rgba(255, 255, 255, 0.2)' : modeColors.accent}
                  />
                </TouchableOpacity>

                <Text style={[styles.prescValue, { color: modeColors.accent, minWidth: 20, textAlign: 'center' }]}>
                  {exercise.targetSets}
                </Text>

                <TouchableOpacity
                  onPress={() => onUpdateSets(Math.min(15, exercise.targetSets + 1))}
                  disabled={exercise.targetSets >= 15}
                  style={[
                    styles.modalStepBtn,
                    exercise.targetSets >= 15 && styles.modalStepBtnDisabled,
                  ]}
                  activeOpacity={0.7}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Plus
                    size={11}
                    color={exercise.targetSets >= 15 ? 'rgba(255, 255, 255, 0.2)' : modeColors.accent}
                  />
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={styles.prescValue}>{exercise.targetSets}</Text>
            )}
          </View>
          <View style={styles.prescDivider} />
          <View style={styles.prescItem}>
            <Text style={styles.prescLabel}>{t.workout.detailModal.targetReps}</Text>
            <Text style={styles.prescValue}>{exercise.targetReps}</Text>
          </View>
          <View style={styles.prescDivider} />
          <View style={styles.prescItem}>
            <Text style={styles.prescLabel}>{t.workout.detailModal.rest}</Text>
            <Text style={styles.prescValue}>{exercise.restPeriodSeconds}s</Text>
          </View>
          <View style={styles.prescDivider} />
          <View style={styles.prescItem}>
            <Text style={styles.prescLabel}>{t.workout.detailModal.metBurn}</Text>
            <Text style={[styles.prescValue, { color: COLORS.warning }]}>
              {exercise.met || 5.0}
            </Text>
          </View>
        </View>

        {/* Quick Target Reps Preset Selector */}
        {onUpdateReps && (
          <View style={styles.repSelectorCard}>
            <View style={styles.repSelectorHeader}>
              <Text style={[styles.repSelectorTitle, { color: modeColors.accent }]}>
                {t.workout.detailModal.repProtocol}
              </Text>
              <Text style={styles.repSelectorCurrent}>{exercise.targetReps}</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.repPresetsRow}
            >
              {[
                '5 reps (Strength)',
                '6–8 reps (Hypertrophy)',
                '8–12 reps (Standard)',
                '12–15 reps (Endurance)',
                '15–20 reps (Burnout)',
                'To Failure',
              ].map((preset) => {
                const isSelected =
                  exercise.targetReps === preset ||
                  exercise.targetReps.toLowerCase().includes(preset.split(' ')[0].toLowerCase());
                return (
                  <TouchableOpacity
                    key={preset}
                    onPress={() => onUpdateReps(preset)}
                    style={[
                      styles.repPresetPill,
                      isSelected && {
                        backgroundColor: `${modeColors.accent}25`,
                        borderColor: modeColors.accent,
                      },
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.repPresetText,
                        isSelected && { color: modeColors.accent, fontWeight: '700' },
                      ]}
                    >
                      {preset}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Biomechanical Tags Row */}
        <View style={styles.tagsContainer}>
          {exercise.category && (
            <View style={[styles.metaBadge, { borderColor: `${modeColors.accent}40` }]}>
              <Text style={[styles.metaBadgeText, { color: modeColors.accent }]}>
                {exercise.category.toUpperCase()}
              </Text>
            </View>
          )}
          {exercise.equipment && (
            <View style={styles.metaBadge}>
              <Dumbbell size={10} color={COLORS.textMuted} />
              <Text style={styles.metaBadgeText}>
                {exercise.equipment.replace(/_/g, ' ').toUpperCase()}
              </Text>
            </View>
          )}
          {exercise.mechanic && (
            <View style={styles.metaBadge}>
              <Layers size={10} color={COLORS.textMuted} />
              <Text style={styles.metaBadgeText}>
                {exercise.mechanic.toUpperCase()}
              </Text>
            </View>
          )}
          {exercise.forceType && (
            <View style={styles.metaBadge}>
              <Zap size={10} color={COLORS.textMuted} />
              <Text style={styles.metaBadgeText}>
                {exercise.forceType.toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        {/* Targeted Muscles */}
        {((exercise.primaryMuscles && exercise.primaryMuscles.length > 0) ||
          (exercise.secondaryMuscles && exercise.secondaryMuscles.length > 0)) && (
          <View style={styles.sectionBlock}>
            <Text style={[styles.sectionHeading, { color: modeColors.accent }]}>
              {t.workout.detailModal.musclePattern}
            </Text>
            <View style={styles.musclesRow}>
              {exercise.primaryMuscles?.map((muscle) => (
                <View key={muscle} style={styles.primaryMusclePill}>
                  <Text style={styles.primaryMuscleText}>
                    {muscle.replace(/_/g, ' ')}
                  </Text>
                </View>
              ))}
              {exercise.secondaryMuscles?.map((muscle) => (
                <View key={muscle} style={styles.secondaryMusclePill}>
                  <Text style={styles.secondaryMuscleText}>
                    {muscle.replace(/_/g, ' ')}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Coaching Cue Highlight */}
        {exercise.coachingCue && (
          <View style={styles.cueCard}>
            <View style={styles.cueHeaderRow}>
              <ShieldCheck size={14} color={modeColors.accent} />
              <Text style={[styles.cueCardLabel, { color: modeColors.accent }]}>
                {t.workout.detailModal.coachingCue}
              </Text>
            </View>
            <Text style={styles.cueCardBody}>{exercise.coachingCue}</Text>
          </View>
        )}

        {/* Execution Instructions */}
        {exercise.instructions && exercise.instructions.length > 0 && (
          <View style={styles.sectionBlock}>
            <Text style={[styles.sectionHeading, { color: modeColors.accent }]}>
              {t.workout.detailModal.stepByStep}
            </Text>
            <View style={styles.instructionsList}>
              {exercise.instructions.map((step, idx) => (
                <View key={idx} style={styles.instructionRow}>
                  <View style={[styles.stepNumberBadge, { borderColor: `${modeColors.accent}40` }]}>
                    <Text style={[styles.stepNumberText, { color: modeColors.accent }]}>
                      {idx + 1}
                    </Text>
                  </View>
                  <Text style={styles.instructionText}>{step}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Tips from RepDB */}
        {exercise.tips && exercise.tips.length > 1 && (
          <View style={styles.sectionBlock}>
            <Text style={[styles.sectionHeading, { color: modeColors.accent }]}>
              {t.workout.detailModal.formTips}
            </Text>
            <View style={styles.tipsBox}>
              {exercise.tips.slice(1).map((tip, idx) => (
                <Text key={idx} style={styles.tipBullet}>
                  • {tip}
                </Text>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </AppModal>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    flex: 1,
  },
  scrollContainer: {
    paddingTop: 12,
    paddingBottom: 24,
  },
  previewContainer: {
    backgroundColor: '#0A0E14',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 12,
    alignItems: 'center',
    marginBottom: 14,
  },
  imageWrapper: {
    width: '100%',
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseImage: {
    width: '100%',
    height: '100%',
  },
  imageLoadingOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10, 14, 20, 0.6)',
  },
  fallbackBox: {
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  fallbackText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    fontSize: 11,
  },
  poseControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  poseToggleGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  poseBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.xs,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  poseBtnText: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  autoPlayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: RADIUS.xs,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  autoPlayBtnText: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  prescriptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    paddingVertical: 10,
    marginBottom: 12,
  },
  prescItem: {
    alignItems: 'center',
    flex: 1,
  },
  prescLabel: {
    ...TYPOGRAPHY.badge,
    fontSize: 9,
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  prescValue: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 14,
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  modalSetControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    gap: 3,
  },
  modalStepBtn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalStepBtnDisabled: {
    opacity: 0.3,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    backgroundColor: 'transparent',
  },
  repSelectorCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 10,
    marginBottom: 12,
  },
  repSelectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  repSelectorTitle: {
    ...TYPOGRAPHY.badge,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  repSelectorCurrent: {
    ...TYPOGRAPHY.captionBold,
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  repPresetsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  repPresetPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  repPresetText: {
    ...TYPOGRAPHY.caption,
    fontSize: 10.5,
    color: COLORS.textSecondary,
  },
  prescDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  metaBadgeText: {
    ...TYPOGRAPHY.captionBold,
    fontSize: 9.5,
    color: COLORS.textSecondary,
  },
  sectionBlock: {
    marginBottom: 14,
  },
  sectionHeading: {
    ...TYPOGRAPHY.badge,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  musclesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  primaryMusclePill: {
    backgroundColor: 'rgba(0, 240, 255, 0.12)',
    borderColor: 'rgba(0, 240, 255, 0.35)',
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: RADIUS.xs,
  },
  primaryMuscleText: {
    ...TYPOGRAPHY.captionBold,
    fontSize: 10.5,
    color: '#00F0FF',
    textTransform: 'capitalize',
  },
  secondaryMusclePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.xs,
  },
  secondaryMuscleText: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    color: COLORS.textMuted,
    textTransform: 'capitalize',
  },
  cueCard: {
    backgroundColor: 'rgba(0, 240, 255, 0.06)',
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.22)',
    padding: 12,
    marginBottom: 14,
  },
  cueHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  cueCardLabel: {
    ...TYPOGRAPHY.badge,
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cueCardBody: {
    ...TYPOGRAPHY.body,
    fontSize: 12.5,
    color: COLORS.textPrimary,
    lineHeight: 18,
  },
  instructionsList: {
    gap: 8,
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  stepNumberBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  stepNumberText: {
    ...TYPOGRAPHY.captionBold,
    fontSize: 10,
  },
  instructionText: {
    ...TYPOGRAPHY.body,
    fontSize: 12,
    color: COLORS.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  tipsBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: RADIUS.xs,
    padding: 10,
    gap: 6,
  },
  tipBullet: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: COLORS.textMuted,
    lineHeight: 16,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  completeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
  },
  completeBtnPending: {
    backgroundColor: COLORS.cardSecondary,
  },
  completeBtnDone: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  completeBtnText: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 12,
  },
  askCoachBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: RADIUS.sm,
  },
  askCoachBtnText: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 12,
    color: COLORS.textDark,
  },
});
