import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CalisthenicsStage } from '@/types/telemetry';
import { useTranslation } from '@/i18n';
import { COLORS } from '@/theme/colors';
import { RADIUS, SPACING } from '@/theme/spacing';
import { TYPOGRAPHY } from '@/theme/typography';
import { GlassCard } from '@/components/common/GlassCard';
import {
  CheckCircle2,
  Circle,
  MessageSquareQuote,
  Trash2,
} from 'lucide-react-native';

interface SkillTreeCardProps {
  stage: CalisthenicsStage;
  onToggle: (stageId: string) => void;
  onDelete?: (stageId: string) => void;
  onAskCoach: (stage: CalisthenicsStage) => void;
}

export const SkillTreeCard: React.FC<SkillTreeCardProps> = ({
  stage,
  onToggle,
  onDelete,
  onAskCoach,
}) => {
  const { t } = useTranslation();
  const isCompleted = !!stage.completed;

  return (
    <GlassCard
      style={[
        styles.card,
        isCompleted && styles.cardCompleted,
      ]}
    >
      <View style={styles.topRow}>
        {/* Completion Checkbox */}
        <TouchableOpacity
          onPress={() => onToggle(stage.id)}
          style={styles.checkButton}
          activeOpacity={0.7}
        >
          {isCompleted ? (
            <CheckCircle2 size={20} color={COLORS.success} />
          ) : (
            <Circle size={20} color={COLORS.textMuted} />
          )}
        </TouchableOpacity>

        {/* Content Box */}
        <View style={styles.titleCol}>
          <View style={styles.badgeRow}>
            <Text style={styles.stageBadge}>
              {t.workout.skillTree.stage.replace('{num}', String(stage.stageNumber))}
            </Text>
            {stage.isCustom && (
              <View style={styles.customTag}>
                <Text style={styles.customTagText}>{t.workout.skillTree.custom}</Text>
              </View>
            )}
            {isCompleted && (
              <Text style={styles.completedTag}>{t.workout.skillTree.mastered}</Text>
            )}
          </View>
          <Text
            style={[
              styles.stageTitle,
              isCompleted && styles.titleCompleted,
            ]}
          >
            {stage.stageTitle}
          </Text>
          {stage.skillName !== stage.stageTitle && (
            <Text style={styles.skillSubtitle}>{stage.skillName}</Text>
          )}
        </View>

        {/* Actions Row: Ask Coach, Delete (if custom) */}
        <View style={styles.actionButtonsCol}>
          <TouchableOpacity
            onPress={() => onAskCoach(stage)}
            style={styles.actionBtn}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            activeOpacity={0.75}
          >
            <MessageSquareQuote size={14} color={COLORS.strict.accent} />
          </TouchableOpacity>

          {stage.isCustom && onDelete && (
            <TouchableOpacity
              onPress={() => onDelete(stage.id)}
              style={[styles.actionBtn, styles.deleteBtn]}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              activeOpacity={0.75}
            >
              <Trash2 size={13} color={COLORS.danger} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Performance Standard Box */}
      <View style={styles.criteriaBox}>
        <Text style={styles.criteriaLabel}>{t.workout.skillTree.performanceStandard}</Text>
        <Text style={styles.criteriaText}>{stage.standard}</Text>
      </View>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: SPACING.md,
    borderRadius: RADIUS.md,
  },
  cardCompleted: {
    opacity: 0.8,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    backgroundColor: 'rgba(16, 185, 129, 0.04)',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  checkButton: {
    paddingTop: 2,
  },
  titleCol: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
    flexWrap: 'wrap',
  },
  stageBadge: {
    ...TYPOGRAPHY.badge,
    fontSize: 9,
    color: COLORS.textMuted,
  },
  customTag: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: RADIUS.round,
    backgroundColor: 'rgba(139, 92, 246, 0.20)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.40)',
  },
  customTagText: {
    ...TYPOGRAPHY.badge,
    fontSize: 8,
    color: COLORS.purpleAccent,
    fontWeight: '800',
  },
  completedTag: {
    ...TYPOGRAPHY.badge,
    fontSize: 9,
    color: COLORS.success,
    fontWeight: '800',
  },
  stageTitle: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  skillSubtitle: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  titleCompleted: {
    color: COLORS.textSecondary,
    textDecorationLine: 'line-through',
  },
  actionButtonsCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  actionBtn: {
    padding: 6,
    borderRadius: RADIUS.round,
    backgroundColor: COLORS.cardSecondary,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  deleteBtn: {
    borderColor: 'rgba(239, 68, 68, 0.3)',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  criteriaBox: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSubtle,
  },
  criteriaLabel: {
    ...TYPOGRAPHY.badge,
    fontSize: 9,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  criteriaText: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
});
