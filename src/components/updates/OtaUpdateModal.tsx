import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { COLORS, getModeColors } from '@/theme/colors';
import { SPACING, RADIUS } from '@/theme/spacing';
import { TYPOGRAPHY } from '@/theme/typography';
import { useCoachStore } from '@/store/useCoachStore';
import { useTranslation } from '@/i18n';
import { Sparkles, ArrowRight, X, RefreshCw, Zap } from 'lucide-react-native';

interface OtaUpdateModalProps {
  visible: boolean;
  onClose: () => void;
  onApplyUpdate: () => Promise<void>;
  channel?: string;
  runtimeVersion?: string;
}

export const OtaUpdateModal: React.FC<OtaUpdateModalProps> = ({
  visible,
  onClose,
  onApplyUpdate,
  channel = 'production',
  runtimeVersion = '1.2.0',
}) => {
  const { mode } = useCoachStore();
  const modeColors = getModeColors(mode);
  const { t } = useTranslation();
  const [isApplying, setIsApplying] = useState(false);

  const handleApply = async () => {
    setIsApplying(true);
    try {
      await onApplyUpdate();
    } catch (err) {
      console.warn('[OtaUpdateModal] Apply update error:', err);
      setIsApplying(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.card,
            {
              borderColor: `${modeColors.accent}4D`,
              shadowColor: modeColors.accent,
            },
          ]}
        >
          {/* Close button */}
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            disabled={isApplying}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <X size={18} color={COLORS.textMuted} />
          </TouchableOpacity>

          {/* Top glowing icon */}
          <View
            style={[
              styles.iconWrapper,
              {
                backgroundColor: `${modeColors.accent}1A`,
                borderColor: `${modeColors.accent}55`,
              },
            ]}
          >
            <Sparkles size={28} color={modeColors.accent} />
          </View>

          {/* Tag / Badge */}
          <View
            style={[
              styles.tagPill,
              {
                backgroundColor: `${modeColors.accent}1F`,
                borderColor: `${modeColors.accent}40`,
              },
            ]}
          >
            <Zap size={11} color={modeColors.accent} style={{ marginRight: 4 }} />
            <Text style={[styles.tagText, { color: modeColors.accent }]}>
              {t.settings.otaModalBadge}
            </Text>
          </View>

          {/* Title */}
          <Text style={styles.title}>{t.settings.otaModalTitle}</Text>

          {/* Description */}
          <Text style={styles.description}>{t.settings.otaModalDesc}</Text>

          {/* Meta Info Box */}
          <View style={styles.metaContainer}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>{t.settings.otaChannel}</Text>
              <Text style={styles.metaValue}>{channel}</Text>
            </View>
            <View style={styles.metaDivider} />
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>{t.settings.otaRuntime}</Text>
              <Text style={styles.metaValue}>v{runtimeVersion}</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[
                styles.primaryBtn,
                { backgroundColor: modeColors.accent },
                isApplying && { opacity: 0.8 },
              ]}
              onPress={handleApply}
              disabled={isApplying}
              activeOpacity={0.85}
            >
              {isApplying ? (
                <>
                  <ActivityIndicator size="small" color="#000" />
                  <Text style={styles.primaryBtnText}>
                    {t.settings.otaModalApplying}
                  </Text>
                </>
              ) : (
                <>
                  <RefreshCw size={17} color="#000" style={styles.btnIcon} />
                  <Text style={styles.primaryBtnText}>
                    {t.settings.otaModalRestartBtn}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={onClose}
              disabled={isApplying}
              activeOpacity={0.7}
            >
              <Text style={styles.secondaryBtnText}>
                {t.settings.otaModalLaterBtn}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: COLORS.cardBackground,
    borderRadius: RADIUS.xl,
    borderWidth: 1.5,
    padding: SPACING.xl,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    padding: 6,
    borderRadius: RADIUS.round,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 3,
    borderRadius: RADIUS.round,
    borderWidth: 1,
    marginBottom: SPACING.sm,
  },
  tagText: {
    ...TYPOGRAPHY.badge,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  title: {
    ...TYPOGRAPHY.h2,
    fontSize: 19,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.xs + 2,
    letterSpacing: 0.5,
  },
  description: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: SPACING.md,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    width: '100%',
    paddingVertical: SPACING.xs + 2,
    marginBottom: SPACING.lg,
  },
  metaItem: {
    flex: 1,
    alignItems: 'center',
  },
  metaDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  metaLabel: {
    ...TYPOGRAPHY.badge,
    fontSize: 9,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  metaValue: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textPrimary,
    fontWeight: '700',
    fontSize: 12,
  },
  actionsContainer: {
    width: '100%',
    gap: SPACING.sm,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: RADIUS.lg,
    gap: 8,
  },
  btnIcon: {
    marginRight: 2,
  },
  primaryBtnText: {
    ...TYPOGRAPHY.button,
    color: '#000',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.3,
  },
  secondaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  secondaryBtnText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
});
