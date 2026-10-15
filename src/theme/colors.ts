export const COLORS = {
  // Base Obsidian Athlete Dark Palette
  background: '#080B10',
  cardBackground: '#0F141C',
  cardSecondary: '#161E2B',
  surfaceElevated: '#1D2738',

  // Glassmorphic overlays & borders
  borderSubtle: 'rgba(255, 255, 255, 0.08)',
  borderActive: 'rgba(255, 255, 255, 0.20)',
  glassBackground: 'rgba(15, 20, 28, 0.75)',

  // Coaching Mode Dynamic Accents
  strict: {
    accent: '#00F0FF',
    accentGlow: 'rgba(0, 240, 255, 0.25)',
    subtle: 'rgba(0, 240, 255, 0.10)',
    gradient: ['#00F0FF', '#0072FF'] as const,
    badgeText: '#00F0FF',
    modeName: 'STRICT ATHLETE',
  },
  comfortable: {
    accent: '#10B981',
    accentGlow: 'rgba(16, 185, 129, 0.25)',
    subtle: 'rgba(16, 185, 129, 0.10)',
    gradient: ['#10B981', '#059669'] as const,
    badgeText: '#10B981',
    modeName: 'SUSTAINABLE HEALTH',
  },

  // Telemetry & Readiness Spectrum
  readinessOptimal: '#10B981',
  readinessModerate: '#F59E0B',
  readinessFatigued: '#EF4444',

  // Typography
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textDark: '#080B10',

  // UI Accents
  purpleAccent: '#8B5CF6',
  warning: '#F59E0B',
  danger: '#EF4444',
  success: '#10B981',
};

export type CoachingMode = 'strict' | 'comfortable';

export function getModeColors(mode: CoachingMode) {
  return mode === 'strict' ? COLORS.strict : COLORS.comfortable;
}
