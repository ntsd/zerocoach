import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChatMessage } from '@/types/chat';
import { COLORS, getModeColors } from '@/theme/colors';
import { RADIUS, SPACING } from '@/theme/spacing';
import { TYPOGRAPHY } from '@/theme/typography';
import { ZeroCoachLogo } from '@/components/common/ZeroCoachLogo';
import { Utensils, Dumbbell, ChevronRight } from 'lucide-react-native';

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

  // Format content with lightweight markdown-like rendering (bold, headers, bullet points)
  const renderFormattedText = (rawText: string) => {
    const lines = rawText.split('\n');
    return lines.map((line, idx) => {
      // Header 3: ### Title
      if (line.startsWith('### ')) {
        return (
          <Text
            key={idx}
            style={[
              styles.heading3,
              { color: isUser ? COLORS.textPrimary : modeColors.accent },
            ]}
          >
            {line.replace('### ', '')}
          </Text>
        );
      }

      // Bullet points: • or -
      if (line.startsWith('• ') || line.startsWith('- ')) {
        const bulletContent = line.replace(/^[•-]\s*/, '');
        return (
          <View key={idx} style={styles.bulletRow}>
            <Text style={[styles.bulletDot, { color: modeColors.accent }]}>•</Text>
            <Text style={styles.bulletText}>
              {renderBoldInline(bulletContent)}
            </Text>
          </View>
        );
      }

      // Empty spacing line
      if (!line.trim()) {
        return <View key={idx} style={styles.emptyLine} />;
      }

      // Standard paragraph
      return (
        <Text key={idx} style={styles.paragraph}>
          {renderBoldInline(line)}
        </Text>
      );
    });
  };

  // Helper to split text by **bold** syntax
  const renderBoldInline = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, pIdx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <Text key={pIdx} style={styles.boldText}>
            {part.slice(2, -2)}
          </Text>
        );
      }
      return part;
    });
  };

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
              {message.modeAtCreation.toUpperCase()} COACH
            </Text>
          </View>
          {message.tokensPerSecond ? (
            <Text style={styles.tokSec}>
              {message.tokensPerSecond} tok/s (on-device)
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
        {renderFormattedText(message.content)}

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
              Log Food in Nutrition Tracker
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
              View Workout & Progressions
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
  paragraph: {
    ...TYPOGRAPHY.body,
    color: COLORS.textPrimary,
    fontSize: 13.5,
    lineHeight: 19.5,
  },
  heading3: {
    ...TYPOGRAPHY.h3,
    fontSize: 14.5,
    marginVertical: 3,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 1.5,
  },
  bulletDot: {
    fontSize: 13,
    marginRight: 6,
    lineHeight: 19,
  },
  bulletText: {
    ...TYPOGRAPHY.body,
    fontSize: 13.5,
    lineHeight: 19.5,
    color: COLORS.textPrimary,
    flex: 1,
  },
  boldText: {
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyLine: {
    height: 4,
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
});
