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

  // Universal Athlete Accent (Signature Obsidian Cyan)
  primary: '#00F0FF',
  primaryGlow: 'rgba(0, 240, 255, 0.25)',
  primarySubtle: 'rgba(0, 240, 255, 0.10)',
  gradientPrimary: ['#00F0FF', '#0072FF'] as const,

  // Signature Accent
  strict: {
    accent: '#00F0FF',
    accentGlow: 'rgba(0, 240, 255, 0.25)',
    subtle: 'rgba(0, 240, 255, 0.10)',
    gradient: ['#00F0FF', '#0072FF'] as const,
    badgeText: '#00F0FF',
    modeName: 'ZEROCOACH AI',
  },
  comfortable: {
    accent: '#00F0FF',
    accentGlow: 'rgba(0, 240, 255, 0.25)',
    subtle: 'rgba(0, 240, 255, 0.10)',
    gradient: ['#00F0FF', '#0072FF'] as const,
    badgeText: '#00F0FF',
    modeName: 'ZEROCOACH AI',
  },

  // Telemetry & Readiness Spectrum (harmonized with web rose)
  readinessOptimal: '#10B981',
  readinessModerate: '#F59E0B',
  readinessFatigued: '#F43F5E',

  // Typography (WCAG AA compliant across card & elevated surfaces)
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#7E8FA4', // Raised from #64748B for 5.04:1 contrast on cards
  textDark: '#080B10',
  textOnPrimary: '#080B10', // Explicit token for primary button text (13.99:1 contrast)

  // UI Accents
  recoveryAccent: '#38BDF8', // Athletic Ice Sky for sleep and recovery metrics
  purpleAccent: '#A78BFA',   // Lifted for WCAG AA compliance (6.54:1 on cards)
  warning: '#F59E0B',
  danger: '#F43F5E',
  success: '#10B981',
};

export const THEME_ACCENT = {
  accent: '#00F0FF',
  accentGlow: 'rgba(0, 240, 255, 0.25)',
  subtle: 'rgba(0, 240, 255, 0.10)',
  gradient: ['#00F0FF', '#0072FF'] as const,
  badgeText: '#00F0FF',
  modeName: 'ZEROCOACH AI',
};

export function getModeColors(_mode?: any) {
  return THEME_ACCENT;
}
