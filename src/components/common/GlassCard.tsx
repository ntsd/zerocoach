import React from 'react';
import { View, StyleSheet, ViewProps, ViewStyle, StyleProp } from 'react-native';
import { COLORS } from '@/theme/colors';
import { RADIUS, SPACING } from '@/theme/spacing';

interface GlassCardProps extends ViewProps {
  glowColor?: string;
  borderColor?: string;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  glowColor,
  borderColor,
  style,
  children,
  ...props
}) => {
  return (
    <View
      style={[
        styles.card,
        borderColor ? { borderColor } : null,
        glowColor
          ? {
              shadowColor: glowColor,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.35,
              shadowRadius: 10,
              elevation: 5,
            }
          : null,
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    padding: SPACING.lg,
  },
});
