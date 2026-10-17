import { useTelemetryStore } from '@/store/useTelemetryStore';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { useNutritionStore } from '@/store/useNutritionStore';
import { DailyAggregateScore, TimeRangeFilter } from '@/types/history';

export interface DayTrendPoint {
  date: string; // YYYY-MM-DD
  dayLabel: string; // "Mon", "Tue" or "10/15"
  isToday: boolean;
  hasRealData: boolean;

  // Composite & Domain Scores (0–100)
  overallScore: number;
  recoveryScore: number;
  workoutScore: number;
  nutritionScore: number;

  // Telemetry & Recovery metrics
  readinessScore: number;
  sleepHours: number;
  deepSleepHours: number;
  hrv: number;
  restingHeartRate: number;
  steps: number;
  activeCalories: number;

  // Workout metrics
  workoutCompleted: boolean;
  workoutTitle?: string;
  workoutMovementsCompleted: number;
  workoutTotalSets: number;
  workoutDurationMin: number;
  workoutCaloriesBurned: number;

  // Nutrition metrics
  nutritionCalories: number;
  targetCalories: number;
  nutritionProtein: number;
  targetProtein: number;
  nutritionCarbs: number;
  nutritionFat: number;
}

export interface AnalyticsSummary {
  timeRange: TimeRangeFilter;
  points: DayTrendPoint[];
  averageOverallScore: number;
  totalWorkoutsCompleted: number;
  averageReadiness: number;
  averageSleepHours: number;
  totalCaloriesBurned: number;
  averageCalorieIntake: number;
  totalDaysWithData: number;
}

function formatDateToYYYYMMDD(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export class AnalyticsService {
  private static instance: AnalyticsService;

  public static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  /**
   * Evaluates the multi-domain score for a specific date
   */
  public calculateDailyScore(date: string): DailyAggregateScore {
    const telemetryState = useTelemetryStore.getState();
    const workoutState = useWorkoutStore.getState();
    const nutritionState = useNutritionStore.getState();

    // 1. Recovery Domain (35% weight baseline)
    const telemetrySnapshot = telemetryState.telemetryHistoryByDate[date];
    const isToday = date === formatDateToYYYYMMDD(new Date());
    const currentMetrics = isToday ? telemetryState.metrics : null;

    let recoveryScore = 0;
    let hasTelemetry = false;

    if (telemetrySnapshot && telemetrySnapshot.readinessScore > 0) {
      recoveryScore = telemetrySnapshot.readinessScore;
      hasTelemetry = true;
    } else if (currentMetrics && currentMetrics.readinessScore > 0) {
      recoveryScore = currentMetrics.readinessScore;
      hasTelemetry = true;
    }

    // 2. Workout Domain (35% weight baseline)
    const workoutSession = workoutState.historyByDate[date];
    let workoutScore = 0;
    let hasWorkout = false;

    if (workoutSession) {
      hasWorkout = true;
      const plannedMovements = Math.max(
        1,
        workoutSession.totalMovements - workoutSession.skippedExerciseIds.length
      );
      const completionRatio = workoutSession.completedMovements / plannedMovements;
      workoutScore = Math.min(100, Math.round(completionRatio * 100));
    }

    // 3. Nutrition Domain (30% weight baseline)
    const nutritionLog = nutritionState.logsByDate[date];
    let nutritionScore = 0;
    let hasNutrition = false;

    if (nutritionLog && nutritionLog.foods.length > 0) {
      hasNutrition = true;
      const summary = nutritionState.getSummaryForDate(date);
      const targetCals = Math.max(1, nutritionLog.targetCalories);
      const targetPro = Math.max(1, nutritionLog.targetProtein);

      // Calorie accuracy: 100% if exact, reduces if under/over by >15%
      const calRatio = summary.totalCalories / targetCals;
      const calAccuracy = Math.max(0, 100 - Math.abs(1 - calRatio) * 100);

      // Protein target compliance (100% if goal reached)
      const proRatio = summary.totalProtein / targetPro;
      const proAccuracy = Math.min(100, proRatio * 100);

      nutritionScore = Math.round(calAccuracy * 0.5 + proAccuracy * 0.5);
    }

    // 4. Weighted Composite Score
    // If some domains have no data on that day, dynamically redistribute weights
    let overallScore = 0;
    const activeWeights: { score: number; weight: number }[] = [];

    if (hasTelemetry) activeWeights.push({ score: recoveryScore, weight: 0.35 });
    if (hasWorkout) activeWeights.push({ score: workoutScore, weight: 0.35 });
    if (hasNutrition) activeWeights.push({ score: nutritionScore, weight: 0.30 });

    if (activeWeights.length > 0) {
      const totalWeight = activeWeights.reduce((acc, curr) => acc + curr.weight, 0);
      const weightedSum = activeWeights.reduce(
        (acc, curr) => acc + curr.score * curr.weight,
        0
      );
      overallScore = Math.round(weightedSum / totalWeight);
    }

    return {
      date,
      overallScore,
      recoveryScore,
      workoutScore,
      nutritionScore,
      hasTelemetry,
      hasWorkout,
      hasNutrition,
    };
  }

  /**
   * Fetches and aggregates trend data for 7D, 14D, or 30D
   */
  public getTrends(timeRange: TimeRangeFilter): AnalyticsSummary {
    const daysCount = timeRange === '7D' ? 7 : timeRange === '14D' ? 14 : 30;
    const now = new Date();
    const points: DayTrendPoint[] = [];

    const telemetryState = useTelemetryStore.getState();
    const workoutState = useWorkoutStore.getState();
    const nutritionState = useNutritionStore.getState();

    const todayStr = formatDateToYYYYMMDD(now);

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = formatDateToYYYYMMDD(d);
      const isToday = dateStr === todayStr;

      const dayIndex = d.getDay();
      const dayLabel = daysCount <= 7 ? DAY_NAMES[dayIndex] : `${d.getMonth() + 1}/${d.getDate()}`;

      // Scores
      const dailyScore = this.calculateDailyScore(dateStr);

      // Telemetry
      const teleSnapshot = telemetryState.telemetryHistoryByDate[dateStr];
      const liveMetrics = isToday ? telemetryState.metrics : null;
      const tele = teleSnapshot || (liveMetrics && liveMetrics.readinessScore > 0 ? liveMetrics : null);

      // Workout
      const workout = workoutState.historyByDate[dateStr];

      // Nutrition
      const nutLog = nutritionState.logsByDate[dateStr];
      const nutSummary = nutLog ? nutritionState.getSummaryForDate(dateStr) : null;

      const hasRealData = dailyScore.hasTelemetry || dailyScore.hasWorkout || dailyScore.hasNutrition;

      points.push({
        date: dateStr,
        dayLabel,
        isToday,
        hasRealData,
        overallScore: dailyScore.overallScore,
        recoveryScore: dailyScore.recoveryScore,
        workoutScore: dailyScore.workoutScore,
        nutritionScore: dailyScore.nutritionScore,
        readinessScore: tele?.readinessScore || 0,
        sleepHours: tele?.sleepHours || 0,
        deepSleepHours: tele?.deepSleepHours || 0,
        hrv: tele?.heartRateVariability || 0,
        restingHeartRate: tele?.restingHeartRate || 0,
        steps: tele?.steps || 0,
        activeCalories: tele?.activeCalories || 0,
        workoutCompleted: !!workout,
        workoutTitle: workout?.title,
        workoutMovementsCompleted: workout?.completedMovements || 0,
        workoutTotalSets: workout?.totalSets || 0,
        workoutDurationMin: workout?.durationMinutes || 0,
        workoutCaloriesBurned: workout?.caloriesBurned || 0,
        nutritionCalories: nutSummary?.totalCalories || 0,
        targetCalories: nutLog?.targetCalories || 0,
        nutritionProtein: nutSummary?.totalProtein || 0,
        targetProtein: nutLog?.targetProtein || 0,
        nutritionCarbs: nutSummary?.totalCarbs || 0,
        nutritionFat: nutSummary?.totalFat || 0,
      });
    }

    // Summary calculations across days with real data
    const daysWithData = points.filter((p) => p.hasRealData);
    const countWithData = daysWithData.length;

    const avgOverall =
      countWithData > 0
        ? Math.round(daysWithData.reduce((acc, p) => acc + p.overallScore, 0) / countWithData)
        : 0;

    const avgReadiness =
      points.filter((p) => p.readinessScore > 0).length > 0
        ? Math.round(
            points.filter((p) => p.readinessScore > 0).reduce((acc, p) => acc + p.readinessScore, 0) /
              points.filter((p) => p.readinessScore > 0).length
          )
        : 0;

    const avgSleep =
      points.filter((p) => p.sleepHours > 0).length > 0
        ? Number(
            (
              points.filter((p) => p.sleepHours > 0).reduce((acc, p) => acc + p.sleepHours, 0) /
              points.filter((p) => p.sleepHours > 0).length
            ).toFixed(1)
          )
        : 0;

    const avgCals =
      points.filter((p) => p.nutritionCalories > 0).length > 0
        ? Math.round(
            points.filter((p) => p.nutritionCalories > 0).reduce((acc, p) => acc + p.nutritionCalories, 0) /
              points.filter((p) => p.nutritionCalories > 0).length
          )
        : 0;

    const totalWorkouts = points.filter((p) => p.workoutCompleted).length;
    const totalBurned = points.reduce((acc, p) => acc + p.activeCalories + p.workoutCaloriesBurned, 0);

    return {
      timeRange,
      points,
      averageOverallScore: avgOverall,
      totalWorkoutsCompleted: totalWorkouts,
      averageReadiness: avgReadiness,
      averageSleepHours: avgSleep,
      totalCaloriesBurned: totalBurned,
      averageCalorieIntake: avgCals,
      totalDaysWithData: countWithData,
    };
  }
}

export const analyticsService = AnalyticsService.getInstance();
