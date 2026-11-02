import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useMemoryStore } from '@/store/useMemoryStore';
import { MemoryCategory } from '@/types/memory';
import { inferCategoryFromContent } from '@/services/memory/mem0Engine';
import { GlassCard } from '@/components/common/GlassCard';
import { COLORS, getModeColors } from '@/theme/colors';
import { SPACING, RADIUS } from '@/theme/spacing';
import { TYPOGRAPHY } from '@/theme/typography';
import { useTranslation } from '@/i18n';
import { Brain, Plus, X, Trash2 } from 'lucide-react-native';

interface DomainMemoryPillProps {
  categories: MemoryCategory[];
  label?: string;
  accentColor?: string;
  onPress: () => void;
}

export const DomainMemoryPill: React.FC<DomainMemoryPillProps> = ({
  categories,
  label,
  accentColor,
  onPress,
}) => {
  const modeColors = getModeColors();
  const color = accentColor || modeColors.accent;
  const memories = useMemoryStore((state) => state.memories);
  const count = memories.filter((m) => categories.includes(m.category)).length;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        styles.pillButton,
        {
          borderColor: `${color}45`,
          backgroundColor: `${color}14`,
        },
      ]}
    >
      <Brain size={13} color={color} />
      {label ? (
        <Text style={[styles.pillLabel, { color: COLORS.textPrimary }]} numberOfLines={1}>
          {label}
        </Text>
      ) : null}
      <View style={[styles.pillCountBadge, { backgroundColor: `${color}28` }]}>
        <Text style={[styles.pillCountText, { color }]}>{count}</Text>
      </View>
    </TouchableOpacity>
  );
};

interface DomainMemoryModalProps {
  visible: boolean;
  onClose: () => void;
  categories: MemoryCategory[];
  title: string;
  subtitle: string;
  placeholder?: string;
  accentColor?: string;
}

export const DomainMemoryModal: React.FC<DomainMemoryModalProps> = ({
  visible,
  onClose,
  categories,
  title,
  subtitle,
  placeholder,
  accentColor,
}) => {
  const { t } = useTranslation();
  const modeColors = getModeColors();
  const color = accentColor || modeColors.accent;
  const { memories, remember, forget } = useMemoryStore();

  const [activeFilter, setActiveFilter] = useState<'all' | MemoryCategory>('all');
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (visible) {
      setActiveFilter(categories.length === 1 ? categories[0] : 'all');
    }
  }, [visible, categories]);

  const domainMemories = memories.filter(
    (m) =>
      categories.includes(m.category) &&
      (activeFilter === 'all' || m.category === activeFilter)
  );
  const totalDomainCount = memories.filter((m) => categories.includes(m.category)).length;

  const getCategoryLabel = (cat: MemoryCategory) => {
    switch (cat) {
      case 'food_preference':
        return t.settings.memCatFood;
      case 'workout_preference':
        return t.settings.memCatWorkout;
      case 'injury_limitation':
        return t.settings.memCatInjury;
      case 'personality_style':
        return t.settings.memCatPersonality;
    }
  };

  const handleAddMemory = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    const categoryToUse: MemoryCategory =
      activeFilter !== 'all' ? activeFilter : inferCategoryFromContent(trimmed);
    remember({
      category: categoryToUse,
      content: trimmed,
      source: 'manual',
    });
    setInputValue('');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <GlassCard
          glowColor={`${color}30`}
          borderColor={`${color}45`}
          style={styles.card}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={[styles.iconCircle, { backgroundColor: `${color}20` }]}>
                <Brain size={16} color={color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.superTitle}>MEM0 ATHLETE MEMORY</Text>
                <Text style={styles.title} numberOfLines={1}>
                  {title}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              activeOpacity={0.75}
            >
              <X size={16} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>{subtitle}</Text>

          {/* Category Filter Chips (All + Categories) */}
          {categories.length > 1 && (
            <View style={styles.catRow}>
              <TouchableOpacity
                onPress={() => setActiveFilter('all')}
                activeOpacity={0.8}
                style={[
                  styles.catPill,
                  activeFilter === 'all' && {
                    borderColor: color,
                    backgroundColor: `${color}20`,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.catPillText,
                    activeFilter === 'all' && { color, fontWeight: '700' },
                  ]}
                >
                  {t.settings.memCatAll} ({totalDomainCount})
                </Text>
              </TouchableOpacity>
              {categories.map((cat) => {
                const isSelected = activeFilter === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setActiveFilter(cat)}
                    activeOpacity={0.8}
                    style={[
                      styles.catPill,
                      isSelected && {
                        borderColor: color,
                        backgroundColor: `${color}20`,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.catPillText,
                        isSelected && { color, fontWeight: '700' },
                      ]}
                    >
                      {getCategoryLabel(cat)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Add New Memory Input Row */}
          <View style={styles.inputRow}>
            <TextInput
              value={inputValue}
              onChangeText={setInputValue}
              placeholder={placeholder || t.settings.coachMemoryAddPlaceholder}
              placeholderTextColor={COLORS.textMuted}
              style={styles.textInput}
              onSubmitEditing={handleAddMemory}
              returnKeyType="done"
            />
            <TouchableOpacity
              onPress={handleAddMemory}
              style={[styles.addBtn, { backgroundColor: color }]}
              activeOpacity={0.8}
            >
              <Plus size={15} color="#080B10" />
            </TouchableOpacity>
          </View>

          {/* Saved Domain Memories List */}
          <ScrollView
            style={styles.listScroll}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {domainMemories.length === 0 ? (
              <View style={styles.emptyBox}>
                <Brain size={22} color={COLORS.textMuted} />
                <Text style={styles.emptyText}>{t.settings.coachMemoryEmpty}</Text>
              </View>
            ) : (
              domainMemories.map((mem) => (
                <View key={mem.id} style={styles.memRow}>
                  <View style={{ flex: 1, gap: 3 }}>
                    <View style={styles.memTopMeta}>
                      <Text style={[styles.memCatBadge, { color }]}>
                        {getCategoryLabel(mem.category)}
                      </Text>
                    </View>
                    <Text style={styles.memContentText}>{mem.content}</Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => forget(mem.id)}
                    style={styles.deleteBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    activeOpacity={0.7}
                  >
                    <Trash2 size={14} color={COLORS.textMuted} />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>

          {/* Done Button */}
          <TouchableOpacity
            onPress={onClose}
            style={[styles.doneBtn, { backgroundColor: color }]}
            activeOpacity={0.85}
          >
            <Text style={styles.doneBtnText}>{t.common.done}</Text>
          </TouchableOpacity>
        </GlassCard>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  pillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: RADIUS.round,
    borderWidth: 1,
  },
  pillLabel: {
    ...TYPOGRAPHY.captionBold,
    fontSize: 10.5,
  },
  pillCountBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: RADIUS.round,
    minWidth: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillCountText: {
    ...TYPOGRAPHY.badge,
    fontSize: 9.5,
    fontWeight: '800',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  card: {
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    maxHeight: '82%',
    gap: SPACING.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
    paddingRight: 8,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  superTitle: {
    ...TYPOGRAPHY.badge,
    fontSize: 8.5,
    color: COLORS.textMuted,
    letterSpacing: 1,
  },
  title: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    ...TYPOGRAPHY.caption,
    fontSize: 11.5,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  catRow: {
    flexDirection: 'row',
    gap: 6,
  },
  catPill: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  catPillText: {
    ...TYPOGRAPHY.captionBold,
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    paddingHorizontal: 12,
    paddingVertical: 9,
    color: COLORS.textPrimary,
    fontSize: 12.5,
  },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listScroll: {
    maxHeight: 280,
  },
  listContent: {
    gap: 8,
    paddingVertical: 4,
  },
  emptyBox: {
    paddingVertical: 26,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.borderSubtle,
  },
  emptyText: {
    ...TYPOGRAPHY.caption,
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  memRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  memTopMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  memCatBadge: {
    ...TYPOGRAPHY.badge,
    fontSize: 9,
    fontWeight: '800',
  },
  memContentText: {
    ...TYPOGRAPHY.body,
    fontSize: 12.5,
    color: COLORS.textPrimary,
    lineHeight: 17,
  },
  deleteBtn: {
    padding: 4,
  },
  doneBtn: {
    paddingVertical: 11,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  doneBtnText: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 13,
    color: '#080B10',
  },
});

