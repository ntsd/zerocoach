import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useTranslation } from '@/i18n';
import { COLORS } from '@/theme/colors';

export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateDisplay(dateStr: string, language?: string): string {
  const todayStr = getTodayDateString();
  if (dateStr === todayStr) return language === 'th' ? 'วันนี้' : 'Today';

  const d = new Date();
  d.setDate(d.getDate() - 1);
  const yesterdayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
  if (dateStr === yesterdayStr) return language === 'th' ? 'เมื่อวาน' : 'Yesterday';

  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export interface DateNavigationBarProps {
  currentDate: string;
  onPrevDay: () => void;
  onNextDay: () => void;
  onToday: () => void;
  style?: StyleProp<ViewStyle>;
  accentColor?: string;
}

export const DateNavigationBar: React.FC<DateNavigationBarProps> = ({
  currentDate,
  onPrevDay,
  onNextDay,
  onToday,
  style,
  accentColor = COLORS.strict.accent,
}) => {
  const { language } = useTranslation();
  const todayStr = getTodayDateString();
  const isToday = currentDate === todayStr;

  return (
    <View style={[styles.dateRow, style]}>
      <TouchableOpacity
        style={styles.navButton}
        onPress={onPrevDay}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <ChevronLeft size={20} color={COLORS.textSecondary} />
      </TouchableOpacity>

      <TouchableOpacity onPress={onToday} activeOpacity={0.7} style={styles.dateCenter}>
        <Text style={[styles.dateTitle, isToday && { color: accentColor }]}>
          {formatDateDisplay(currentDate, language)}
        </Text>
        <Text style={styles.dateSubtitle}>{currentDate}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.navButton, isToday && styles.navButtonDisabled]}
        onPress={onNextDay}
        disabled={isToday}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <ChevronRight
          size={20}
          color={isToday ? 'rgba(255, 255, 255, 0.2)' : COLORS.textSecondary}
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
