import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LoggedFood } from '../../types/nutrition';
import { useTranslation } from '../../i18n';
import { COLORS } from '../../theme/colors';
import {
  X,
  Utensils,
  Minus,
  Plus,
  Flame,
  CheckCircle,
  Trash2,
  Camera,
} from 'lucide-react-native';

interface LoggedFoodDetailModalProps {
  visible: boolean;
  food: LoggedFood | null;
  onClose: () => void;
  onUpdateGrams: (foodId: string, newGrams: number) => void;
  onRemoveFood: (foodId: string) => void;
}

export const LoggedFoodDetailModal: React.FC<LoggedFoodDetailModalProps> = ({
  visible,
  food,
  onClose,
  onUpdateGrams,
  onRemoveFood,
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const bottomSafePadding =
    Math.max(insets.bottom, Platform.OS === 'android' ? 48 : 20) + 12;

  if (!food) return null;

  const consumedGrams = Math.round(food.consumedGrams || 100);
  const dynamicNutrients = food.nutrients;

  const adjustGrams = (delta: number) => {
    const next = Math.max(10, Math.min(2000, consumedGrams + delta));
    onUpdateGrams(food.id, next);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { paddingBottom: bottomSafePadding }]}>
          {/* Top Bar */}
          <View style={styles.topBar}>
            <View style={styles.topBarLeft}>
              <Utensils size={18} color="#00F0FF" />
              <Text style={styles.topBarTitle} numberOfLines={1}>
                {food.name}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <X size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.reviewContent}
            contentContainerStyle={{ paddingBottom: 16 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Food Header & Portion Adjustment Card */}
            <View style={styles.reviewHeaderCard}>
              {food.imageUrl ? (
                <View style={styles.reviewImageContainer}>
                  <Image
                    source={{ uri: food.imageUrl }}
                    style={styles.reviewImage}
                    resizeMode="cover"
                  />
                  <View style={styles.reviewImageBadge}>
                    <Camera size={12} color="#00F0FF" />
                    <Text style={styles.reviewImageBadgeText}>
                      {t.nutrition.aiSnapPhotoBadge}
                    </Text>
                  </View>
                </View>
              ) : null}

              <View style={styles.reviewTitleRow}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.reviewFoodName}>{food.name}</Text>
                  {food.brand ? (
                    <Text style={styles.reviewFoodBrand}>{food.brand}</Text>
                  ) : null}
                </View>
                <View style={styles.reviewTitleRight}>
                  <View
                    style={[
                      styles.sourceTag,
                      food.source === 'usda_bundled'
                        ? { backgroundColor: 'rgba(16, 185, 129, 0.15)' }
                        : food.source === 'ai_decomposed'
                        ? { backgroundColor: 'rgba(168, 85, 247, 0.15)' }
                        : { backgroundColor: 'rgba(56, 189, 248, 0.15)' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.sourceTagText,
                        food.source === 'usda_bundled'
                          ? { color: '#10B981' }
                          : food.source === 'ai_decomposed'
                          ? { color: '#A855F7' }
                          : { color: '#38BDF8' },
                      ]}
                    >
                      {food.source === 'usda_bundled'
                        ? t.nutrition.badges.usda
                        : food.source === 'ai_decomposed'
                        ? t.nutrition.badges.aiMeal
                        : t.nutrition.badges.openFood}
                    </Text>
                  </View>

                  {food.offQuantity ? (
                    <View style={styles.offQuantityBadge}>
                      <Text style={styles.offQuantityBadgeText}>
                        Qty: {food.offQuantity}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>

              {/* Gram Weight Stepper (Live Updates Store) */}
              <Text style={styles.subSectionTitle}>
                {t.nutrition.adjustServing.toUpperCase()}
              </Text>
              <View style={styles.stepperContainer}>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => adjustGrams(-25)}
                  activeOpacity={0.6}
                >
                  <Minus size={18} color={COLORS.textPrimary} />
                </TouchableOpacity>

                <View style={styles.stepperDisplay}>
                  <Text style={styles.stepperNumber}>{consumedGrams}</Text>
                  <Text style={styles.stepperUnit}>g</Text>
                </View>

                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => adjustGrams(25)}
                  activeOpacity={0.6}
                >
                  <Plus size={18} color={COLORS.textPrimary} />
                </TouchableOpacity>
              </View>

              {/* Quick Gram Chips */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.quickGramsRow}
              >
                {food.packageQuantityGrams ? (
                  <TouchableOpacity
                    style={[
                      styles.quickGramChip,
                      styles.quickGramChipOff,
                      consumedGrams === food.packageQuantityGrams &&
                        styles.quickGramChipActive,
                    ]}
                    onPress={() => onUpdateGrams(food.id, food.packageQuantityGrams!)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.quickGramText,
                        styles.quickGramTextOff,
                        consumedGrams === food.packageQuantityGrams &&
                          styles.quickGramTextActive,
                      ]}
                    >
                      {food.packageQuantityUnitName || `${food.packageQuantityGrams}g`} (Full Pack)
                    </Text>
                  </TouchableOpacity>
                ) : null}

                {food.servingQuantityGrams &&
                food.servingQuantityGrams !== food.packageQuantityGrams ? (
                  <TouchableOpacity
                    style={[
                      styles.quickGramChip,
                      styles.quickGramChipOff,
                      consumedGrams === food.servingQuantityGrams &&
                        styles.quickGramChipActive,
                    ]}
                    onPress={() => onUpdateGrams(food.id, food.servingQuantityGrams!)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.quickGramText,
                        styles.quickGramTextOff,
                        consumedGrams === food.servingQuantityGrams &&
                          styles.quickGramTextActive,
                      ]}
                    >
                      {`${food.servingQuantityGrams}g`} (1 Serving)
                    </Text>
                  </TouchableOpacity>
                ) : null}

                {[50, 100, 150, 200, 300]
                  .filter(
                    (g) =>
                      g !== food.packageQuantityGrams &&
                      g !== food.servingQuantityGrams
                  )
                  .map((g) => (
                    <TouchableOpacity
                      key={g}
                      style={[
                        styles.quickGramChip,
                        consumedGrams === g && styles.quickGramChipActive,
                      ]}
                      onPress={() => onUpdateGrams(food.id, g)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.quickGramText,
                          consumedGrams === g && styles.quickGramTextActive,
                        ]}
                      >
                        {g}g
                      </Text>
                    </TouchableOpacity>
                  ))}
              </ScrollView>
            </View>

            {/* Dynamic Macro & Micronutrient Summary */}
            <View style={styles.nutrientsSummaryCard}>
              <View style={styles.calorieHighlight}>
                <Flame size={20} color="#FF6B35" />
                <Text style={styles.calorieBigText}>{dynamicNutrients.calories}</Text>
                <Text style={styles.calorieBigUnit}>kcal</Text>
              </View>

              {/* 5 Macros */}
              <View style={styles.macrosFourRow}>
                <View style={styles.macroMiniBox}>
                  <Text style={styles.macroMiniLabel}>{t.nutrition.header.protein}</Text>
                  <Text style={[styles.macroMiniVal, { color: '#10B981' }]}>
                    {dynamicNutrients.proteinGrams}g
                  </Text>
                </View>
                <View style={styles.macroMiniBox}>
                  <Text style={styles.macroMiniLabel}>{t.nutrition.header.carbs}</Text>
                  <Text style={[styles.macroMiniVal, { color: '#38BDF8' }]}>
                    {dynamicNutrients.carbsGrams}g
                  </Text>
                </View>
                <View style={styles.macroMiniBox}>
                  <Text style={styles.macroMiniLabel}>{t.nutrition.header.fat}</Text>
                  <Text style={[styles.macroMiniVal, { color: '#F59E0B' }]}>
                    {dynamicNutrients.fatGrams}g
                  </Text>
                </View>
                <View style={styles.macroMiniBox}>
                  <Text style={styles.macroMiniLabel}>{t.nutrition.scorecard.fiber}</Text>
                  <Text style={[styles.macroMiniVal, { color: '#A855F7' }]}>
                    {dynamicNutrients.fiberGrams}g
                  </Text>
                </View>
                <View style={styles.macroMiniBox}>
                  <Text style={styles.macroMiniLabel}>{t.nutrition.header.sugar}</Text>
                  <Text style={[styles.macroMiniVal, { color: '#FB7185' }]}>
                    {dynamicNutrients.sugarGrams ?? 0}g
                  </Text>
                </View>
              </View>

              {/* Key Micronutrients */}
              <Text style={styles.microsSubHeading}>{t.nutrition.micronutrientAssay}</Text>
              <View style={styles.microAssayGrid}>
                <View style={styles.microChip}>
                  <Text style={styles.microChipLabel}>{t.nutrition.vitamins.vitA}</Text>
                  <Text style={styles.microChipVal}>{dynamicNutrients.vitaminA_mcg} mcg</Text>
                </View>
                <View style={styles.microChip}>
                  <Text style={styles.microChipLabel}>{t.nutrition.vitamins.vitC}</Text>
                  <Text style={styles.microChipVal}>{dynamicNutrients.vitaminC_mg} mg</Text>
                </View>
                <View style={styles.microChip}>
                  <Text style={styles.microChipLabel}>{t.nutrition.vitamins.vitD}</Text>
                  <Text style={styles.microChipVal}>{dynamicNutrients.vitaminD_mcg} mcg</Text>
                </View>
                <View style={styles.microChip}>
                  <Text style={styles.microChipLabel}>{t.nutrition.vitamins.vitB12}</Text>
                  <Text style={styles.microChipVal}>{dynamicNutrients.vitaminB12_mcg} mcg</Text>
                </View>
                <View style={styles.microChip}>
                  <Text style={styles.microChipLabel}>{t.nutrition.vitamins.iron}</Text>
                  <Text style={styles.microChipVal}>{dynamicNutrients.iron_mg} mg</Text>
                </View>
                <View style={styles.microChip}>
                  <Text style={styles.microChipLabel}>{t.nutrition.vitamins.calcium}</Text>
                  <Text style={styles.microChipVal}>{dynamicNutrients.calcium_mg} mg</Text>
                </View>
                <View style={styles.microChip}>
                  <Text style={styles.microChipLabel}>{t.nutrition.vitamins.magnesium}</Text>
                  <Text style={styles.microChipVal}>{dynamicNutrients.magnesium_mg} mg</Text>
                </View>
                <View style={styles.microChip}>
                  <Text style={styles.microChipLabel}>{t.nutrition.vitamins.potassium}</Text>
                  <Text style={styles.microChipVal}>{dynamicNutrients.potassium_mg} mg</Text>
                </View>
                <View style={styles.microChip}>
                  <Text style={styles.microChipLabel}>{t.nutrition.vitamins.sodium}</Text>
                  <Text style={styles.microChipVal}>{dynamicNutrients.sodium_mg} mg</Text>
                </View>
                <View style={styles.microChip}>
                  <Text style={styles.microChipLabel}>{t.nutrition.vitamins.zinc}</Text>
                  <Text style={styles.microChipVal}>{dynamicNutrients.zinc_mg} mg</Text>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Docked Footer with Remove & Done Buttons */}
          <View style={styles.dockedFooter}>
            <TouchableOpacity
              accessibilityRole="button"
              style={styles.removeBtn}
              onPress={() => {
                onRemoveFood(food.id);
                onClose();
              }}
              activeOpacity={0.8}
            >
              <Trash2 size={17} color={COLORS.danger} />
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityRole="button"
              style={styles.confirmLogButton}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <CheckCircle size={18} color="#080B10" />
              <Text style={styles.confirmLogButtonText}>
                {t.common.done} ({consumedGrams}g • {dynamicNutrients.calories} kcal)
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(4, 6, 10, 0.85)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#0B0F17',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    maxHeight: '90%',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    paddingRight: 10,
  },
  topBarTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  reviewHeaderCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 14,
  },
  reviewImageContainer: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    position: 'relative',
  },
  reviewImage: {
    width: '100%',
    height: '100%',
  },
  reviewImageBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(8, 11, 16, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.35)',
  },
  reviewImageBadgeText: {
    color: '#00F0FF',
    fontSize: 10,
    fontWeight: '700',
  },
  reviewTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  reviewFoodName: {
    color: COLORS.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  reviewFoodBrand: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  reviewTitleRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  sourceTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sourceTagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  offQuantityBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  offQuantityBadgeText: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '600',
  },
  subSectionTitle: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderRadius: 14,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  stepBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  stepperNumber: {
    color: '#00F0FF',
    fontSize: 26,
    fontWeight: '800',
  },
  stepperUnit: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  quickGramsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  quickGramChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  quickGramChipOff: {
    borderColor: 'rgba(56, 189, 248, 0.35)',
  },
  quickGramChipActive: {
    backgroundColor: 'rgba(0, 240, 255, 0.16)',
    borderColor: '#00F0FF',
  },
  quickGramText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  quickGramTextOff: {
    color: '#38BDF8',
  },
  quickGramTextActive: {
    color: '#00F0FF',
    fontWeight: '700',
  },
  nutrientsSummaryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  calorieHighlight: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 14,
  },
  calorieBigText: {
    color: COLORS.textPrimary,
    fontSize: 30,
    fontWeight: '800',
  },
  calorieBigUnit: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  macrosFourRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  macroMiniBox: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  macroMiniLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 4,
  },
  macroMiniVal: {
    fontSize: 14,
    fontWeight: '800',
  },
  microsSubHeading: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  microAssayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  microChip: {
    width: '48%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  microChipLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  microChipVal: {
    color: COLORS.textPrimary,
    fontSize: 11,
    fontWeight: '700',
  },
  dockedFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  removeBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmLogButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#00F0FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  confirmLogButtonText: {
    color: '#080B10',
    fontSize: 14,
    fontWeight: '800',
  },
});

