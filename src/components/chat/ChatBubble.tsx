import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChatMessage } from '@/types/chat';
import { useTranslation } from '@/i18n';
import { COLORS, getModeColors } from '@/theme/colors';
import { RADIUS, SPACING } from '@/theme/spacing';
import { TYPOGRAPHY } from '@/theme/typography';
import { ZeroCoachLogo } from '@/components/common/ZeroCoachLogo';
import { MarkdownText } from '@/components/common/MarkdownText';
import { Utensils, Dumbbell, ChevronRight, Zap } from 'lucide-react-native';

interface ChatBubbleProps {
  message: ChatMessage;
  onNavigateToNutrition?: () => void;
  onNavigateToWorkout?: () => void;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({
  message,
  onNavigateToNutrition,
  onNavigateToWorkout,
}) => {
  const { t } = useTranslation();
  const isUser = message.role === 'user';
  const modeColors = getModeColors(message.modeAtCreation);

  // Check if assistant message suggests foods or workouts so we can provide deep-link action pills
  const isFoodRelated =
    !isUser &&
    Boolean(onNavigateToNutrition) &&
    (
      /remaining (protein|calories|kcal)/i.test(message.content) ||
      /suggest(ed)? (food|meal|eat|snack|dish|breakfast|lunch|dinner)/i.test(message.content) ||
      /\b(salmon|chicken breast|greek yogurt|sweet potato|oats|quinoa|eggs|protein shake)\b/i.test(message.content) ||
      /\b(\d+g protein|\d+\s?kcal)\b/i.test(message.content)
    );

  const isWorkoutRelated =
    !isUser &&
    Boolean(onNavigateToWorkout) &&
    !isFoodRelated &&
    (
      /prescribed exercises|workout plan|sets ×|scapular retraction|progressive overload|bodyweight cues/i.test(message.content)
    );

  const modeBadgeText =
    message.modeAtCreation === 'strict'
      ? `${t.mode.strict.toUpperCase()} ${t.tabs.coach.toUpperCase()}`
      : `${t.mode.comfortable.toUpperCase()} ${t.tabs.coach.toUpperCase()}`;

  return (
    <View
      style={[
        styles.container,
        isUser ? styles.userContainer : styles.assistantContainer,
      ]}
    >
      {!isUser && (
        <View style={styles.assistantHeader}>
          <View style={styles.badgeRow}>
            <ZeroCoachLogo size={13} mode={message.modeAtCreation} />
            <Text style={[styles.coachBadge, { color: modeColors.accent }]}>
              {modeBadgeText}
            </Text>
          </View>
          {message.tokensPerSecond ? (
            <Text style={styles.tokSec}>
              {message.tokensPerSecond} {t.coach.tokSecOnDevice}
            </Text>
          ) : null}
        </View>
      )}

      <View
        style={[
          styles.bubble,
          isUser
            ? styles.userBubble
            : [
                styles.assistantBubble,
                { borderColor: `${modeColors.accent}25` },
              ],
        ]}
      >
        <MarkdownText
          content={message.content}
          accentColor={modeColors.accent}
          isUser={isUser}
          baseTextStyle={isUser ? styles.userText : styles.assistantText}
        />

        {message.executionSteps && message.executionSteps.length > 0 && (
          <View style={styles.stepsContainer}>
            {message.executionSteps.map((step) => (
              <View
                key={step.id}
                style={[
                  styles.stepBadge,
                  {
                    borderColor: `${modeColors.accent}40`,
                    backgroundColor: `${modeColors.accent}12`,
                  },
                ]}
              >
                <Zap size={11} color={modeColors.accent} />
                <Text
                  style={[styles.stepText, { color: modeColors.accent }]}
                  numberOfLines={2}
                >
                  {step.summary}
                </Text>
              </View>
            ))}
          </View>
        )}

        {isFoodRelated && onNavigateToNutrition && (
          <TouchableOpacity
            style={[
              styles.actionChip,
              {
                borderColor: `${modeColors.accent}40`,
                backgroundColor: `${modeColors.accent}12`,
              },
            ]}
            onPress={onNavigateToNutrition}
            activeOpacity={0.75}
          >
            <Utensils size={12} color={modeColors.accent} />
            <Text style={[styles.actionChipText, { color: modeColors.accent }]}>
              {t.coach.logFoodAction}
            </Text>
            <ChevronRight size={12} color={modeColors.accent} />
          </TouchableOpacity>
        )}

        {isWorkoutRelated && onNavigateToWorkout && (
          <TouchableOpacity
            style={[
              styles.actionChip,
              {
                borderColor: `${modeColors.accent}40`,
                backgroundColor: `${modeColors.accent}12`,
              },
            ]}
            onPress={onNavigateToWorkout}
            activeOpacity={0.75}
          >
            <Dumbbell size={12} color={modeColors.accent} />
            <Text style={[styles.actionChipText, { color: modeColors.accent }]}>
              {t.coach.viewWorkoutAction}
            </Text>
            <ChevronRight size={12} color={modeColors.accent} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    paddingHorizontal: SPACING.md,
  },
  userContainer: {
    alignItems: 'flex-end',
  },
  assistantContainer: {
    alignItems: 'flex-start',
  },
  assistantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  coachBadge: {
    ...TYPOGRAPHY.badge,
    fontSize: 10,
    fontWeight: '800',
  },
  tokSec: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    color: COLORS.textMuted,
  },
  bubble: {
    borderRadius: RADIUS.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '92%',
  },
  userBubble: {
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderBottomRightRadius: RADIUS.xs,
  },
  assistantBubble: {
    backgroundColor: COLORS.cardBackground,
    borderWidth: 1,
    borderBottomLeftRadius: RADIUS.xs,
  },
  userText: {
    ...TYPOGRAPHY.body,
    fontSize: 13.5,
    lineHeight: 20,
    color: COLORS.textPrimary,
  },
  assistantText: {
    ...TYPOGRAPHY.body,
    fontSize: 13.5,
    lineHeight: 20,
    color: COLORS.textPrimary,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.round,
    borderWidth: 1,
  },
  actionChipText: {
    ...TYPOGRAPHY.badge,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  stepsContainer: {
    marginTop: 8,
    gap: 4,
  },
  stepBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.xs,
    borderWidth: 1,
  },
  stepText: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
});
