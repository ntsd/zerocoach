import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNutritionStore } from '../store/useNutritionStore';
import { MacroProgressHeader } from '../components/nutrition/MacroProgressHeader';
import { MicronutrientScorecard } from '../components/nutrition/MicronutrientScorecard';
import { DailyFoodLedgerCard } from '../components/nutrition/DailyFoodLedgerCard';
import { FoodSearchAndReviewModal } from '../components/nutrition/FoodSearchAndReviewModal';
import { LoggedFoodDetailModal } from '../components/nutrition/LoggedFoodDetailModal';
import { FoodItem, MealType } from '../types/nutrition';
import { useTranslation } from '../i18n';
import { COLORS } from '../theme/colors';
import { getTodayString, getLocalDateString } from '@/utils/date';
import { Utensils, Plus, RotateCcw } from 'lucide-react-native';

export const NutritionScreen: React.FC = () => {
  const { t } = useTranslation();
  const {
    selectedDate,
    setSelectedDate,
    getDailyLog,
    getSummaryForDate,
    logFood,
    updateLoggedFoodGrams,
    removeLoggedFood,
    clearDayLog,
  } = useNutritionStore();

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedLoggedFoodId, setSelectedLoggedFoodId] = useState<string | null>(null);

  // Always ensure selectedDate is today on mount
  useEffect(() => {
    const todayStr = getTodayString();
    if (selectedDate !== todayStr) {
      setSelectedDate(todayStr);
    }
  }, []);

  // Purge any legacy demo foods that were previously seeded
  useEffect(() => {
    const currentLog = getDailyLog(selectedDate);
    const demoItems = currentLog.foods.filter((f) => f.id.startsWith('demo_'));
    demoItems.forEach((item) => {
      removeLoggedFood(item.id, selectedDate);
    });
  }, [selectedDate, getDailyLog, removeLoggedFood]);

  const dailyLog = getDailyLog(selectedDate);
  const summary = getSummaryForDate(selectedDate);

  const handlePrevDay = () => {
    const [year, month, day] = selectedDate.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() - 1);
    setSelectedDate(getLocalDateString(date));
  };

  const handleNextDay = () => {
    const todayStr = getTodayString();
    if (selectedDate >= todayStr) return; // Prevent navigating into future dates

    const [year, month, day] = selectedDate.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() + 1);
    setSelectedDate(getLocalDateString(date));
  };

  const handleToday = () => {
    setSelectedDate(getTodayString());
  };

  const handleOpenAddFood = () => {
    setModalVisible(true);
  };

  const handleLogFoodItem = (
    food: FoodItem,
    mealType: MealType,
    servings: number,
    consumedGrams: number
  ) => {
    logFood(food, mealType, servings, consumedGrams, selectedDate);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <View style={styles.titleContainer}>
          <View style={styles.titleIconRow}>
            <Utensils size={20} color={COLORS.primary} />
            <Text style={styles.screenTitle}>{t.nutrition.screenTitle}</Text>
          </View>
          <Text style={styles.screenSubtitle}>{t.nutrition.screenSubtitle}</Text>
        </View>

        <TouchableOpacity
          style={styles.quickAddButton}
          onPress={handleOpenAddFood}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t.nutrition.logBtn || 'Log food'}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Plus size={16} color={COLORS.textOnPrimary} />
          <Text style={styles.quickAddButtonText}>{t.nutrition.logBtn}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Macro & Calories Progress Header */}
        <MacroProgressHeader
          currentDate={selectedDate}
          dailyLog={dailyLog}
          summary={summary}
          onPrevDay={handlePrevDay}
          onNextDay={handleNextDay}
          onToday={handleToday}
        />

        {/* Micronutrient Bio-Scorecard */}
        <MicronutrientScorecard summary={summary} />

        {/* Unified Daily Food Ledger Card */}
        <DailyFoodLedgerCard
          foods={dailyLog.foods}
          onAddFood={handleOpenAddFood}
          onRemoveFood={(id) => removeLoggedFood(id, selectedDate)}
          onSelectFood={(food) => setSelectedLoggedFoodId(food.id)}
        />

        {/* Reset / Clear Day helper */}
        {dailyLog.foods.length > 0 && (
          <TouchableOpacity
            style={styles.clearDayButton}
            onPress={() => clearDayLog(selectedDate)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t.nutrition.clearLogDay}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <RotateCcw size={14} color={COLORS.textMuted} />
            <Text style={styles.clearDayText}>{t.nutrition.clearLogDay}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Food Search and Review Modal */}
      <FoodSearchAndReviewModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onLogFood={handleLogFoodItem}
      />

      {/* Logged Food Detail & Live Portion Edit Modal */}
      <LoggedFoodDetailModal
        visible={Boolean(selectedLoggedFoodId)}
        food={dailyLog.foods.find((f) => f.id === selectedLoggedFoodId) || null}
        onClose={() => setSelectedLoggedFoodId(null)}
        onUpdateGrams={(foodId, newGrams) =>
          updateLoggedFoodGrams(foodId, newGrams, selectedDate)
        }
        onRemoveFood={(foodId) => removeLoggedFood(foodId, selectedDate)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  titleContainer: {
    flex: 1,
  },
  titleIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  screenTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1,
  },
  screenSubtitle: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  quickAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 14,
    minHeight: 34,
  },
  quickAddButtonText: {
    color: COLORS.textOnPrimary,
    fontSize: 12,
    fontWeight: '800',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  clearDayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    marginTop: 8,
    marginBottom: 20,
  },
  clearDayText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
});
