import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useTranslation } from '@/i18n';
import { COLORS } from '@/theme/colors';
import { formatDateDisplay, getTodayString } from '@/utils/date';

export { formatDateDisplay };
export const getTodayDateString = getTodayString;

export interface DateNavigationBarProps {
  currentDate: string;
  onPrevDay: () => void;
  onNextDay: () => void;
  onToday: () => void;
  style?: StyleProp<ViewStyle>;
  accentColor?: string;
  allowFutureDates?: boolean;
}

export const DateNavigationBar: React.FC<DateNavigationBarProps> = ({
  currentDate,
  onPrevDay,
  onNextDay,
  onToday,
  style,
  accentColor = COLORS.strict.accent,
  allowFutureDates = false,
}) => {
  const { t, language } = useTranslation();
  const todayStr = getTodayDateString();
  const isToday = currentDate === todayStr;
  const isNextDisabled = !allowFutureDates && isToday;

  return (
    <View style={[styles.dateRow, style]}>
      <TouchableOpacity
        style={styles.navButton}
        onPress={onPrevDay}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={t.common.previousDay}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <ChevronLeft size={20} color={COLORS.textSecondary} />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onToday}
        activeOpacity={0.7}
        style={styles.dateCenter}
        accessibilityRole="button"
        accessibilityLabel={t.common.currentDateBackToToday}
      >
        <Text style={[styles.dateTitle, isToday && { color: accentColor }]}>
          {formatDateDisplay(currentDate, language, t)}
        </Text>
        <Text style={styles.dateSubtitle}>{currentDate}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.navButton, isNextDisabled && styles.navButtonDisabled]}
        onPress={onNextDay}
        disabled={isNextDisabled}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={t.common.nextDay}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <ChevronRight
          size={20}
          color={isNextDisabled ? 'rgba(255, 255, 255, 0.2)' : COLORS.textSecondary}
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonDisabled: {
    opacity: 0.35,
  },
  dateCenter: {
    alignItems: 'center',
  },
  dateTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  dateSubtitle: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 1,
  },
});
