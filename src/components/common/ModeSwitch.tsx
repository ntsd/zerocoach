import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useCoachStore } from '@/store/useCoachStore';
import { COLORS, getModeColors } from '@/theme/colors';
import { RADIUS, SPACING } from '@/theme/spacing';
import { TYPOGRAPHY } from '@/theme/typography';
import { ShieldAlert, HeartHandshake } from 'lucide-react-native';

export const ModeSwitch: React.FC = () => {
  const { mode, toggleMode, setMode } = useCoachStore();
  const isStrict = mode === 'strict';
  const modeColors = getModeColors(mode);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => setMode('strict')}
        style={[
          styles.pill,
          isStrict && styles.activePillStrict,
          isStrict && { shadowColor: COLORS.strict.accent },
        ]}
      >
        <ShieldAlert
          size={12}
          color={isStrict ? COLORS.strict.accent : COLORS.textMuted}
        />
        <Text
          style={[
            styles.pillText,
            isStrict ? styles.activeText : styles.inactiveText,
            isStrict && { color: COLORS.strict.accent },
          ]}
        >
          STRICT
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => setMode('comfortable')}
        style={[
          styles.pill,
          !isStrict && styles.activePillComfortable,
          !isStrict && { shadowColor: COLORS.comfortable.accent },
        ]}
      >
        <HeartHandshake
          size={12}
          color={!isStrict ? COLORS.comfortable.accent : COLORS.textMuted}
        />
        <Text
          style={[
            styles.pillText,
            !isStrict ? styles.activeText : styles.inactiveText,
            !isStrict && { color: COLORS.comfortable.accent },
          ]}
        >
          COMFORT
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: COLORS.cardSecondary,
    borderRadius: RADIUS.round,
    padding: 2,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: RADIUS.round,
  },
  activePillStrict: {
    backgroundColor: COLORS.strict.subtle,
    borderWidth: 1,
    borderColor: COLORS.strict.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 3,
  },
  activePillComfortable: {
    backgroundColor: COLORS.comfortable.subtle,
    borderWidth: 1,
    borderColor: COLORS.comfortable.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 3,
  },
  pillText: {
    ...TYPOGRAPHY.badge,
    fontSize: 10,
  },
  activeText: {
    fontWeight: '800',
  },
  inactiveText: {
    color: COLORS.textMuted,
  },
});
