import { Easing, FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

/**
 * The one place motion timing is defined — screens never invent their own
 * duration or easing. Kept short and calm on purpose: this is a food-planning
 * app, not a game, so nothing should bounce, spring, or loop.
 */
export const motionDuration = {
  fast: 120,
  standard: 200,
  slow: 320,
} as const;

export const motionEasing = {
  standard: Easing.out(Easing.cubic),
  decelerate: Easing.out(Easing.quad),
  accelerate: Easing.in(Easing.quad),
} as const;

/**
 * Entering/exiting/layout presets, gated by the caller's reduced-motion flag
 * (see hooks/useReducedMotionPreference.ts). Passing `undefined` to a
 * Reanimated `entering`/`exiting`/`layout` prop simply skips the animation —
 * the element still appears/disappears/reflows, just instantly.
 */
export function enterFade(reducedMotion: boolean, duration: keyof typeof motionDuration = 'standard') {
  return reducedMotion ? undefined : FadeIn.duration(motionDuration[duration]);
}

export function exitFade(reducedMotion: boolean, duration: keyof typeof motionDuration = 'fast') {
  return reducedMotion ? undefined : FadeOut.duration(motionDuration[duration]);
}

export function layoutTransition(reducedMotion: boolean, duration: keyof typeof motionDuration = 'standard') {
  return reducedMotion ? undefined : LinearTransition.duration(motionDuration[duration]);
}
