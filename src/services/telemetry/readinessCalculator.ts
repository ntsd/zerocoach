/**
 * Calculates a holistic physiological readiness score (0 - 100)
 * based on Sleep Quality, Heart Rate Variability (HRV), and Resting Heart Rate deviation.
 */
export function calculateReadinessScore(params: {
  sleepHours: number;
  sleepQualityScore: number;
  restingHeartRate: number;
  heartRateVariability: number;
}): number {
  const { sleepHours, sleepQualityScore, restingHeartRate, heartRateVariability } = params;

  // 1. Sleep Component (40% weight)
  // Optimal sleep is between 7.5 and 9 hours
  const sleepDurationScore = Math.min(100, (sleepHours / 8.0) * 100);
  const compositeSleep = (sleepDurationScore * 0.5) + (sleepQualityScore * 0.5);

  // 2. HRV Component (35% weight)
  // Higher HRV generally indicates better parasympathetic recovery. Typical baseline 50-80ms
  const hrvScore = Math.min(100, Math.max(20, (heartRateVariability / 70) * 100));

  // 3. Resting Heart Rate Component (25% weight)
  // Lower RHR relative to 50 bpm baseline indicates good recovery; elevated indicates fatigue
  const rhrDeviation = Math.max(0, restingHeartRate - 48);
  const rhrScore = Math.max(20, 100 - (rhrDeviation * 3.5));

  const total = (compositeSleep * 0.40) + (hrvScore * 0.35) + (rhrScore * 0.25);
  return Math.round(Math.min(100, Math.max(10, total)));
}

export function getReadinessCategory(score: number): {
  label: string;
  color: string;
  guidance: string;
} {
  if (score >= 80) {
    return {
      label: 'Optimal Peak Recovery',
      color: '#10B981',
      guidance: 'Body is fully primed for high-intensity calisthenics or heavy strength work.',
    };
  } else if (score >= 60) {
    return {
      label: 'Moderate Readiness',
      color: '#F59E0B',
      guidance: 'Solid state for skill practice and moderate volume. Keep rest intervals disciplined.',
    };
  } else {
    return {
      label: 'Fatigued / Rest Advised',
      color: '#EF4444',
      guidance: 'CNS or physical fatigue detected. Prioritize active recovery, mobility, and clean nutrition.',
    };
  }
}
