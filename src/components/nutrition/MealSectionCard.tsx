import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { GlassCard } from '../common/GlassCard';
import { LoggedFood, MealType } from '../../types/nutrition';
import { COLORS } from '../../theme/colors';
import {
  Coffee,
  Sun,
  Moon,
  Apple,
  Plus,
  Trash2,
  Sparkles,
  Barcode,
  CheckCircle,
} from 'lucide-react-native';

interface MealSectionCardProps {
  mealType: MealType;
  title: string;
  foods: LoggedFood[];
  onAddFood: (mealType: MealType) => void;
  onRemoveFood: (foodId: string) => void;
}

export const MealSectionCard: React.FC<MealSectionCardProps> = ({
  mealType,
  title,
  foods,
  onAddFood,
  onRemoveFood,
}) => {
  // Aggregate meal calories and protein
  const mealCalories = foods.reduce((sum, f) => sum + f.nutrients.calories, 0);
  const mealProtein = Math.round(foods.reduce((sum, f) => sum + f.nutrients.proteinGrams, 0) * 10) / 10;

  const renderIcon = () => {
    switch (mealType) {
      case 'breakfast':
        return <Coffee size={16} color="#F59E0B" />;
      case 'lunch':
        return <Sun size={16} color="#38BDF8" />;
      case 'dinner':
        return <Moon size={16} color="#8B5CF6" />;
      case 'snack':
        return <Apple size={16} color="#10B981" />;
    }
  };

  const renderSourceBadge = (source: LoggedFood['source']) => {
    switch (source) {
      case 'usda_bundled':
        return (
          <View style={[styles.sourceBadge, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
            <CheckCircle size={10} color="#10B981" />
            <Text style={[styles.sourceBadgeText, { color: '#10B981' }]}>USDA Whole</Text>
          </View>
        );
      case 'open_food_facts':
        return (
          <View style={[styles.sourceBadge, { backgroundColor: 'rgba(56, 189, 248, 0.12)' }]}>
            <Barcode size={10} color="#38BDF8" />
            <Text style={[styles.sourceBadgeText, { color: '#38BDF8' }]}>Open Food Facts</Text>
          </View>
        );
      case 'ai_decomposed':
        return (
          <View style={[styles.sourceBadge, { backgroundColor: 'rgba(168, 85, 247, 0.12)' }]}>
            <Sparkles size={10} color="#A855F7" />
            <Text style={[styles.sourceBadgeText, { color: '#A855F7' }]}>AI Meal</Text>
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
          <View style={styles.iconCircle}>{renderIcon()}</View>
          <View>
            <Text style={styles.mealTitle}>{title}</Text>
            {foods.length > 0 && (
              <Text style={styles.mealMacroSummary}>
                {mealCalories} kcal • {mealProtein}g P
              </Text>
            )}
          </View>
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          style={styles.addButton}
          onPress={() => onAddFood(mealType)}
          activeOpacity={0.7}
        >
          <Plus size={14} color="#00F0FF" />
          <Text style={styles.addButtonText}>Add Food</Text>
        </TouchableOpacity>
      </View>

      {/* Food items list */}
      {foods.length === 0 ? (
        <TouchableOpacity
          accessibilityRole="button"
          style={styles.emptyContainer}
          onPress={() => onAddFood(mealType)}
          activeOpacity={0.7}
        >
          <Text style={styles.emptyText}>No food logged for {title.toLowerCase()} yet.</Text>
          <Text style={styles.emptySubtext}>Tap + Add Food to log whole foods, scan, or snap a photo.</Text>
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
                  <Text style={styles.portionText}>{Math.round(food.consumedGrams)}g</Text>
                  <Text style={styles.dotSeparator}>•</Text>
                  <Text style={styles.calBadge}>{food.nutrients.calories} kcal</Text>
                  <Text style={styles.dotSeparator}>•</Text>
                  <Text style={styles.microSummaryText}>
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
    padding: 14,
    backgroundColor: '#0F141C',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  mealMacroSummary: {
    color: COLORS.strict.accent,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
    paddingHorizontal: 10,
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
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 10,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  emptySubtext: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginTop: 3,
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
    padding: 10,
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
  microSummaryText: {
    color: COLORS.textMuted,
    fontSize: 10,
  },
  deleteButton: {
    padding: 6,
    borderRadius: 8,
  },
});
