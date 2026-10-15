import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CalisthenicsStage } from '@/types/telemetry';
import { COLORS } from '@/theme/colors';
import { RADIUS, SPACING } from '@/theme/spacing';
import { TYPOGRAPHY } from '@/theme/typography';
import { GlassCard } from '@/components/common/GlassCard';
import { CheckCircle2, Circle, MessageSquareQuote } from 'lucide-react-native';

interface SkillTreeCardProps {
  stage: CalisthenicsStage;
  onToggle: (stageId: string) => void;
  onAskCoach: (stage: CalisthenicsStage) => void;
}

export const SkillTreeCard: React.FC<SkillTreeCardProps> = ({
  stage,
  onToggle,
  onAskCoach,
}) => {
  return (
    <GlassCard
      style={[
        styles.card,
        stage.completed ? styles.cardCompleted : undefined,
      ]}
    >
      <View style={styles.topRow}>
        <TouchableOpacity
          onPress={() => onToggle(stage.id)}
          style={styles.checkButton}
          activeOpacity={0.7}
        >
          {stage.completed ? (
            <CheckCircle2 size={20} color={COLORS.success} />
          ) : (
            <Circle size={20} color={COLORS.textMuted} />
          )}
        </TouchableOpacity>

        <View style={styles.titleCol}>
          <View style={styles.badgeRow}>
            <Text style={styles.stageBadge}>STAGE {stage.stageNumber}</Text>
            {stage.completed && (
              <Text style={styles.completedTag}>MASTERED</Text>
            )}
          </View>
          <Text
            style={[
              styles.stageTitle,
              stage.completed && styles.titleCompleted,
            ]}
          >
            {stage.stageTitle}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => onAskCoach(stage)}
          style={styles.askButton}
          activeOpacity={0.75}
        >
          <MessageSquareQuote size={16} color={COLORS.strict.accent} />
        </TouchableOpacity>
      </View>

      <View style={styles.criteriaBox}>
        <Text style={styles.criteriaLabel}>PERFORMANCE STANDARD:</Text>
        <Text style={styles.criteriaText}>{stage.standard}</Text>
      </View>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  card: {
    marginVertical: SPACING.xs + 2,
    padding: SPACING.md,
  },
  cardCompleted: {
    borderColor: 'rgba(16, 185, 129, 0.25)',
    backgroundColor: 'rgba(16, 185, 129, 0.04)',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
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
  },
  stageBadge: {
    ...TYPOGRAPHY.badge,
    fontSize: 9,
    color: COLORS.textMuted,
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
  titleCompleted: {
    color: COLORS.textSecondary,
    textDecorationLine: 'line-through',
  },
  askButton: {
    padding: 6,
    borderRadius: RADIUS.round,
    backgroundColor: COLORS.cardSecondary,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
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
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
});
