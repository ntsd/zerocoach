import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTelemetryStore } from '@/store/useTelemetryStore';
import { useCoachStore } from '@/store/useCoachStore';
import { useChatStore } from '@/store/useChatStore';
import { CalisthenicsStage } from '@/types/telemetry';
import { COLORS, getModeColors } from '@/theme/colors';
import { SPACING, RADIUS } from '@/theme/spacing';
import { TYPOGRAPHY } from '@/theme/typography';
import { SkillTreeCard } from '@/components/progressions/SkillTreeCard';
import { Dumbbell, Trophy, ArrowRight } from 'lucide-react-native';

interface ProgressionsScreenProps {
  onNavigateToChat: () => void;
}

export const ProgressionsScreen: React.FC<ProgressionsScreenProps> = ({
  onNavigateToChat,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<'All' | 'L-Sit' | 'Bar Muscle-Up'>('All');
  const { calisthenicsStages, toggleStageCompletion } = useTelemetryStore();
  const { mode } = useCoachStore();
  const { sendMessage } = useChatStore();
  const modeColors = getModeColors(mode);

  const filteredStages = calisthenicsStages.filter((stage) => {
    if (selectedFilter === 'All') return true;
    return stage.skillName === selectedFilter;
  });

  const completedCount = calisthenicsStages.filter((s) => s.completed).length;
  const totalCount = calisthenicsStages.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  const handleAskCoach = async (stage: CalisthenicsStage) => {
    onNavigateToChat();
    const prompt = `Coach, I am currently working on ${stage.skillName} Stage ${stage.stageNumber}: "${stage.stageTitle}". The standard is "${stage.standard}". What form cues, common pitfalls, and set/rep schemes should I adhere to based on my readiness?`;
    await sendMessage(prompt);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <View style={styles.titleRow}>
              <Dumbbell size={20} color={modeColors.accent} />
              <Text style={styles.title}>WORKOUT & PROGRESSIONS</Text>
            </View>
            <Text style={styles.subtitle}>
              Adaptive Training Plan • Calisthenics Mastery
            </Text>
          </View>
        </View>

        {/* Generate Today's Workout Quick Banner */}
        <TouchableOpacity
          onPress={() => {
            onNavigateToChat();
            sendMessage("Coach, please design my complete workout plan for today based on my goals, calisthenics target stage, and live recovery readiness score.");
          }}
          style={[styles.workoutPromptCard, { borderColor: `${modeColors.accent}40` }]}
          activeOpacity={0.8}
        >
          <View style={styles.workoutPromptHeader}>
            <View style={styles.workoutPromptBadge}>
              <Text style={[styles.workoutPromptBadgeText, { color: modeColors.accent }]}>
                AI WORKOUT GENERATOR
              </Text>
            </View>
            <ArrowRight size={14} color={modeColors.accent} />
          </View>
          <Text style={styles.workoutPromptTitle}>
            Request Today's Adaptive Workout Session
          </Text>
          <Text style={styles.workoutPromptSub}>
            Tailors sets, reps, and warmups to your recovery readiness & primary goals
          </Text>
        </TouchableOpacity>

        {/* Overall Mastery Progress Card */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <View style={styles.trophyRow}>
              <Trophy size={16} color={COLORS.warning} />
              <Text style={styles.progressTitle}>TOTAL SKILL MASTERY</Text>
            </View>
            <Text style={styles.progressValue}>
              {completedCount} of {totalCount} ({progressPercent}%)
            </Text>
          </View>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${progressPercent}%`, backgroundColor: modeColors.accent },
              ]}
            />
          </View>
        </View>

        {/* Skill Filter Pills */}
        <View style={styles.filterRow}>
          {(['All', 'L-Sit', 'Bar Muscle-Up'] as const).map((filter) => {
            const isSelected = selectedFilter === filter;
            return (
              <TouchableOpacity
                key={filter}
                onPress={() => setSelectedFilter(filter)}
                style={[
                  styles.filterPill,
                  isSelected && styles.filterPillActive,
                  isSelected && { borderColor: modeColors.accent },
                ]}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.filterText,
                    isSelected && { color: modeColors.accent, fontWeight: '700' },
                  ]}
                >
                  {filter}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* List of Stages */}
        <View style={styles.stageList}>
          {filteredStages.map((stage) => (
            <SkillTreeCard
              key={stage.id}
              stage={stage}
              onToggle={toggleStageCompletion}
              onAskCoach={handleAskCoach}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxxl,
  },
  header: {
    marginBottom: SPACING.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    ...TYPOGRAPHY.h3,
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  subtitle: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: COLORS.textMuted,
  },
  workoutPromptCard: {
    backgroundColor: COLORS.cardBackground,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    gap: 4,
  },
  workoutPromptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  workoutPromptBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  workoutPromptBadgeText: {
    ...TYPOGRAPHY.badge,
    fontSize: 9,
    fontWeight: '800',
  },
  workoutPromptTitle: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  workoutPromptSub: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: COLORS.textSecondary,
    lineHeight: 15,
  },
  progressCard: {
    backgroundColor: COLORS.cardBackground,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    marginBottom: SPACING.lg,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs + 2,
  },
  trophyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  progressTitle: {
    ...TYPOGRAPHY.badge,
    fontSize: 10,
    color: COLORS.textPrimary,
  },
  progressValue: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.cardSecondary,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  filterRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  filterPill: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.round,
    backgroundColor: COLORS.cardSecondary,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  filterPillActive: {
    backgroundColor: COLORS.surfaceElevated,
  },
  filterText: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  stageList: {
    gap: SPACING.xs,
  },
});
