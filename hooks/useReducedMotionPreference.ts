import { useReducedMotion } from 'react-native-reanimated';

/**
 * Thin wrapper over Reanimated's OS-level reduced-motion detection — one
 * name the rest of the app imports, so if the underlying mechanism ever
 * changes it's a one-file fix instead of a find-and-replace.
 */
export function useReducedMotionPreference(): boolean {
  return useReducedMotion();
}
