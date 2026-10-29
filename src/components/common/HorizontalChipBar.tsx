import React from 'react';
import {
  ScrollView,
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  View,
} from 'react-native';
import { COLORS, getModeColors } from '@/theme/colors';
import { RADIUS, SPACING } from '@/theme/spacing';
import { TYPOGRAPHY } from '@/theme/typography';
import { LucideIcon } from 'lucide-react-native';

export interface ChipItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  prompt?: string;
  badge?: string | number;
}

export interface HorizontalChipBarProps {
  items: ChipItem[];
  selectedId?: string;
  onSelect: (item: ChipItem) => void;
  disabled?: boolean;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
}

export const HorizontalChipBar: React.FC<HorizontalChipBarProps> = ({
  items,
  selectedId,
  onSelect,
  disabled,
  style,
  contentContainerStyle,
}) => {
  const modeColors = getModeColors();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[styles.scrollView, style]}
      contentContainerStyle={[styles.container, contentContainerStyle]}
    >
      {items.map((item) => {
        const IconComponent = item.icon;
        const isSelected = selectedId ? selectedId === item.id : false;

        return (
          <TouchableOpacity
            key={item.id}
            disabled={disabled}
            onPress={() => onSelect(item)}
            style={[
              styles.chip,
              isSelected ? styles.chipSelected : styles.chipDefault,
              {
                borderColor: isSelected
                  ? modeColors.accent
                  : `${modeColors.accent}30`,
                backgroundColor: isSelected
                  ? `${modeColors.accent}20`
                  : COLORS.cardSecondary,
              },
            ]}
            activeOpacity={0.75}
          >
            {IconComponent && (
              <IconComponent
                size={11}
                color={isSelected ? modeColors.accent : modeColors.accent}
              />
            )}
            <Text
              style={[
                styles.chipText,
                isSelected && {
                  color: modeColors.accent,
                  fontWeight: '700',
                },
              ]}
            >
              {item.label}
            </Text>
            {item.badge !== undefined && (
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor: isSelected ? modeColors.accent : `${modeColors.accent}25`,
                    borderColor: `${modeColors.accent}50`,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    { color: isSelected ? COLORS.background : modeColors.accent },
                  ]}
                >
                  {item.badge}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flexGrow: 0,
    flexShrink: 0,
    height: 32,
    maxHeight: 32,
    marginBottom: 4,
  },
  container: {
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
    gap: 6,
    height: 32,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: RADIUS.round,
    borderWidth: 1,
    height: 26,
  },
  chipDefault: {
    backgroundColor: COLORS.cardSecondary,
  },
  chipSelected: {
    shadowColor: COLORS.background,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  chipText: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  badge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: RADIUS.round,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
});
