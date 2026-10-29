import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { GlassCard } from '../common/GlassCard';
import { LoggedFood } from '../../types/nutrition';
import { useTranslation } from '../../i18n';
import { COLORS } from '../../theme/colors';
import {
  UtensilsCrossed,
  Plus,
  Trash2,
  Sparkles,
  Barcode,
  CheckCircle,
} from 'lucide-react-native';

interface DailyFoodLedgerCardProps {
  foods: LoggedFood[];
  onAddFood: () => void;
  onRemoveFood: (foodId: string) => void;
}

export const DailyFoodLedgerCard: React.FC<DailyFoodLedgerCardProps> = ({
  foods,
  onAddFood,
  onRemoveFood,
}) => {
  const { t } = useTranslation();

  // Aggregate daily calories and protein from logged items
  const totalCalories = foods.reduce((sum, f) => sum + f.nutrients.calories, 0);
  const totalProtein =
    Math.round(foods.reduce((sum, f) => sum + f.nutrients.proteinGrams, 0) * 10) / 10;

  const renderSourceBadge = (source: LoggedFood['source']) => {
    switch (source) {
      case 'usda_bundled':
        return (
          <View style={[styles.sourceBadge, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
            <CheckCircle size={10} color="#10B981" />
            <Text style={[styles.sourceBadgeText, { color: '#10B981' }]}>
              {t.nutrition.badges.usda}
            </Text>
          </View>
        );
      case 'open_food_facts':
        return (
          <View style={[styles.sourceBadge, { backgroundColor: 'rgba(56, 189, 248, 0.12)' }]}>
            <Barcode size={10} color="#38BDF8" />
            <Text style={[styles.sourceBadgeText, { color: '#38BDF8' }]}>
              {t.nutrition.badges.openFood}
            </Text>
          </View>
        );
      case 'ai_decomposed':
        return (
          <View style={[styles.sourceBadge, { backgroundColor: 'rgba(168, 85, 247, 0.12)' }]}>
            <Sparkles size={10} color="#A855F7" />
            <Text style={[styles.sourceBadgeText, { color: '#A855F7' }]}>
              {t.nutrition.badges.aiMeal}
            </Text>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <GlassCard style={styles.card}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.iconCircle}>
            <UtensilsCrossed size={16} color="#00F0FF" />
          </View>
          <View>
            <Text style={styles.cardTitle}>{t.nutrition.dailyFoodsTitle}</Text>
            {foods.length > 0 && (
              <Text style={styles.macroSummary}>
                {foods.length} {t.nutrition.meals.itemsCount || 'items'} • {totalCalories} kcal • {totalProtein}g P
              </Text>
            )}
          </View>
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          style={styles.addButton}
          onPress={onAddFood}
          activeOpacity={0.7}
        >
          <Plus size={14} color="#00F0FF" />
          <Text style={styles.addButtonText}>{t.nutrition.logBtn}</Text>
        </TouchableOpacity>
      </View>

      {/* Food items list or clean empty state */}
      {foods.length === 0 ? (
        <TouchableOpacity
          accessibilityRole="button"
          style={styles.emptyContainer}
          onPress={onAddFood}
          activeOpacity={0.7}
        >
          <View style={styles.emptyIconCircle}>
            <UtensilsCrossed size={22} color="rgba(0, 240, 255, 0.6)" />
          </View>
          <Text style={styles.emptyTitle}>{t.nutrition.emptyDailyLog}</Text>
          <Text style={styles.emptySubtitle}>{t.nutrition.emptyDailyLogSub}</Text>
          <View style={styles.emptyActionBtn}>
            <Plus size={13} color="#080B10" />
            <Text style={styles.emptyActionBtnText}>{t.nutrition.logFoodItemBtn}</Text>
          </View>
        </TouchableOpacity>
      ) : (
        <View style={styles.foodList}>
          {foods.map((food) => (
            <View key={food.id} style={styles.foodRow}>
              <View style={styles.foodInfo}>
                <View style={styles.foodNameRow}>
                  <Text style={styles.foodName} numberOfLines={1}>
                    {food.name}
                  </Text>
                  {renderSourceBadge(food.source)}
                </View>

                {food.brand && <Text style={styles.brandName}>{food.brand}</Text>}

                <View style={styles.nutrientsRow}>
                  <Text style={styles.portionText}>
                    {food.offQuantity
                      ? `${food.offQuantity} (${Math.round(food.consumedGrams)}g)`
                      : `${Math.round(food.consumedGrams)}g`}
                  </Text>
                  <Text style={styles.dotSeparator}>•</Text>
                  <Text style={styles.calBadge}>{food.nutrients.calories} kcal</Text>
                  <Text style={styles.dotSeparator}>•</Text>
                  <Text style={styles.macroPills}>
                    P: {food.nutrients.proteinGrams}g | C: {food.nutrients.carbsGrams}g | F: {food.nutrients.fatGrams}g
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                accessibilityRole="button"
                style={styles.deleteButton}
                onPress={() => onRemoveFood(food.id)}
                activeOpacity={0.6}
              >
                <Trash2 size={16} color="#64748B" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
    backgroundColor: '#0F141C',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  macroSummary: {
    color: COLORS.strict.accent,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.25)',
  },
  addButtonText: {
    color: COLORS.strict.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  emptyContainer: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 12,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  emptyIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 240, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptySubtitle: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
    maxWidth: 280,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#00F0FF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    marginTop: 14,
  },
  emptyActionBtnText: {
    color: '#080B10',
    fontSize: 12,
    fontWeight: '700',
  },
  foodList: {
    gap: 8,
  },
  foodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 10,
    padding: 12,
  },
  foodInfo: {
    flex: 1,
    paddingRight: 8,
  },
  foodNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  foodName: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    maxWidth: '75%',
  },
  brandName: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 1,
  },
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  sourceBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  nutrientsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    flexWrap: 'wrap',
  },
  portionText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  dotSeparator: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginHorizontal: 4,
  },
  calBadge: {
    color: '#FF6B35',
    fontSize: 11,
    fontWeight: '700',
  },
  macroPills: {
    color: COLORS.textMuted,
    fontSize: 10,
  },
  deleteButton: {
    padding: 8,
    borderRadius: 8,
  },
});
