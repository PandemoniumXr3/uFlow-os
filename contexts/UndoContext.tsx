import { createContext, useCallback, useContext, useRef, useState, type PropsWithChildren } from 'react';

import { createUndoController, type PendingUndo, type UndoAction } from '@/services/undo/undoStore';

/** How long an undo stays available before it silently expires — shown in the banner as a rough guide, not a countdown. */
export const UNDO_DURATION_MS = 8000;

interface UndoContextValue {
  pending: PendingUndo | null;
  scheduleUndo: (action: UndoAction, durationMs?: number) => void;
  undo: () => Promise<boolean>;
  dismiss: () => void;
}

const UndoContext = createContext<UndoContextValue | null>(null);

/**
 * App-level undo — mounted once at the root so a destructive action stays
 * undoable after navigating away from the screen that triggered it (e.g.
 * deleting a recipe, then leaving Recipe Detail before tapping Undo).
 * In-memory only: an app restart does not need to preserve it. Holds at
 * most one pending action — scheduling a new one (a second destructive
 * action) replaces whatever was pending, matching the single-slot
 * `createUndoController` it wraps.
 */
export function UndoProvider({ children }: PropsWithChildren) {
  const controllerRef = useRef(createUndoController());
  const [, setTick] = useState(0);
  const rerender = useCallback(() => setTick((tick) => tick + 1), []);

  const scheduleUndo = useCallback(
    (action: UndoAction, durationMs: number = UNDO_DURATION_MS) => {
      controllerRef.current.schedule(action, Date.now(), durationMs);
      rerender();
      // Re-render once more after expiry so the banner disappears on its own without the user acting.
      setTimeout(rerender, durationMs + 50);
    },
    [rerender]
  );

  const undo = useCallback(async () => {
    const result = await controllerRef.current.undo(Date.now());
    rerender();
    return result;
  }, [rerender]);

  const dismiss = useCallback(() => {
    controllerRef.current.dismiss();
    rerender();
  }, [rerender]);

  const pending = controllerRef.current.getPending(Date.now());

  return <UndoContext.Provider value={{ pending, scheduleUndo, undo, dismiss }}>{children}</UndoContext.Provider>;
}

export function useUndo(): UndoContextValue {
  const context = useContext(UndoContext);
  if (!context) throw new Error('useUndo must be used within UndoProvider');
  return context;
}
