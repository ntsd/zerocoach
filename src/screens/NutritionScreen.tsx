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
import { FoodItem, MealType } from '../types/nutrition';
import { useTranslation } from '../i18n';
import { COLORS } from '../theme/colors';
import { Utensils, Plus, RotateCcw } from 'lucide-react-native';

export const NutritionScreen: React.FC = () => {
  const { t } = useTranslation();
  const {
    selectedDate,
    setSelectedDate,
    getDailyLog,
    getSummaryForDate,
    logFood,
    removeLoggedFood,
    clearDayLog,
  } = useNutritionStore();

  const [modalVisible, setModalVisible] = useState(false);

  // Always ensure selectedDate is today on mount
  useEffect(() => {
    const d = new Date();
    const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`;
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
    const prevStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
      date.getDate()
    ).padStart(2, '0')}`;
    setSelectedDate(prevStr);
  };

  const handleNextDay = () => {
    const d = new Date();
    const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`;
    if (selectedDate >= todayStr) return; // Prevent navigating into future dates

    const [year, month, day] = selectedDate.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() + 1);
    const nextStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
      date.getDate()
    ).padStart(2, '0')}`;
    setSelectedDate(nextStr);
  };

  const handleToday = () => {
    const d = new Date();
    const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`;
    setSelectedDate(todayStr);
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
            <Utensils size={20} color="#00F0FF" />
            <Text style={styles.screenTitle}>{t.nutrition.screenTitle}</Text>
          </View>
          <Text style={styles.screenSubtitle}>{t.nutrition.screenSubtitle}</Text>
        </View>

        <TouchableOpacity
          style={styles.quickAddButton}
          onPress={handleOpenAddFood}
          activeOpacity={0.7}
        >
          <Plus size={16} color="#080B10" />
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
        />

        {/* Reset / Clear Day helper */}
        {dailyLog.foods.length > 0 && (
          <TouchableOpacity
            style={styles.clearDayButton}
            onPress={() => clearDayLog(selectedDate)}
            activeOpacity={0.7}
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#080B10',
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
    fontSize: 11,
    marginTop: 2,
  },
  quickAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#00F0FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  quickAddButtonText: {
    color: '#080B10',
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
