/**
 * uFlow design tokens.
 *
 * Calm, premium dark theme: deep charcoal with a cool blue tint. Blue is the
 * primary interactive color (buttons, active states, links, toggles). Green
 * is reserved for success/healthy signals only (all ingredients in stock, a
 * safe meal) — it's never used for ordinary primary actions. Cyan marks
 * favorites; ochre marks warnings (missing ingredients, diet mismatches).
 * Keep this the one place that defines color/spacing/type/shadow so screens
 * never hardcode raw values.
 */

export const colors = {
  background: '#10141B',
  surface: '#161C25',
  surfaceRaised: '#1D2530',
  /** A third, brighter surface level for premium cards that need to stand apart from surfaceRaised (greeting header, primary suggestion). */
  surfaceElevated: '#232E3D',
  /** Faint translucent panel for restrained glass effects — used sparingly, never as a default card background. */
  surfaceGlass: 'rgba(35, 46, 61, 0.55)',
  border: '#2A3340',
  borderSubtle: '#20293380',

  textPrimary: '#E8ECF2',
  textSecondary: '#96A2B3',
  textTertiary: '#606C7D',

  accentBlue: '#6E93D6',
  accentBlueMuted: '#3C4F70',
  /** Secondary accent — distinct from primary blue, used for a second layer of emphasis (reason tags, secondary CTAs) so not everything competes for the same blue. */
  accentCyan: '#7FC9D4',
  accentCyanMuted: '#2E4A4E',
  accentTeal: '#5B9C93',
  accentGreen: '#83A38C',
  accentGreenMuted: '#26362C',
  /** Food/warmth/budget highlight — the one place the interface is allowed to feel warm rather than blue. */
  accentOchre: '#CC9F5D',
  accentOchreMuted: '#3A2F1E',
  /** Warm cream/sand — reserved for numeric highlights and the featured suggestion's name, never for body text. */
  textAccentSand: '#E4D3B3',

  danger: '#C77A63',
  dangerMuted: '#3A2620',

  overlay: 'rgba(6, 9, 14, 0.6)',

  /** A warm-neutral dark surface, deliberately less blue than surfaceRaised — for the rare card that shouldn't read as "another blue panel" (e.g. a food/warmth insight). */
  surfaceNeutral: '#1B1A1D',
  /** Hairline divider for separating rows inside one surface without adding another visible card border. */
  divider: 'rgba(232, 236, 242, 0.08)',

  /** Restrained glow tints — a soft halo behind a primary action or the top suggestion, never a hard neon edge. */
  glowBlue: 'rgba(110, 147, 214, 0.22)',
  glowCyan: 'rgba(127, 201, 212, 0.16)',

  /** Atmospheric background gradient stops — subtle depth, not a visible band. */
  gradientBackground: ['#121826', '#0D1119', '#0A0D13'] as [string, string, string],
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  /** Large premium cards (greeting header, primary suggestion) — rounded but not childish. */
  xl: 22,
  full: 999,
} as const;

export const typography = {
  size: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 22,
    xxl: 28,
    /** Greeting-scale text — used once per screen, never for body copy. */
    display: 32,
  },
  weight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  /**
   * Named type roles so screens stop picking size+weight ad hoc. Fewer
   * distinct sizes overall than the raw `size` scale suggests — most content
   * should use one of these, not a bespoke combination.
   */
  role: {
    display: { fontSize: 32, lineHeight: 38, fontWeight: '600' as const },
    pageTitle: { fontSize: 26, lineHeight: 32, fontWeight: '600' as const },
    sectionHeading: { fontSize: 17, lineHeight: 22, fontWeight: '600' as const },
    cardTitle: { fontSize: 16, lineHeight: 21, fontWeight: '600' as const },
    body: { fontSize: 15, lineHeight: 21, fontWeight: '400' as const },
    bodySecondary: { fontSize: 14, lineHeight: 20, fontWeight: '400' as const },
    label: { fontSize: 13, lineHeight: 17, fontWeight: '500' as const },
    /** Large numbers — kcal, meal counts, grocery counts, remaining budget. */
    numericHighlight: { fontSize: 30, lineHeight: 34, fontWeight: '600' as const },
    metadata: { fontSize: 12, lineHeight: 16, fontWeight: '400' as const },
  },
} as const;

/** Soft, subtle elevation for card-like surfaces — never harsh. */
export const shadow = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 3,
  },
  /** A lighter touch than `card` — for chips and small controls that shouldn't visually compete with real cards. */
  soft: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 1,
  },
  /** Barely-there resting elevation for a hero card — depth without a visible glow. */
  ambient: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.24,
    shadowRadius: 20,
    elevation: 4,
  },
  /** Colored halo — reserved for the one featured/selected element on screen, never applied to a whole list. */
  glow: {
    shadowColor: '#6E93D6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 5,
  },
} as const;

export const iconSize = {
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
} as const;
