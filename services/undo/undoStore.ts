/**
 * A generic, single-slot undo controller — not tied to recipes. Scheduling a
 * new action always replaces whatever was pending (only the most recent
 * destructive action needs to be undoable, per spec). Pure and React-free so
 * it's fully testable with an injected clock; the React layer (UndoContext)
 * is a thin wrapper that just triggers re-renders around this.
 */
export interface UndoAction {
  /** Identifies the action for logging/debugging — not used for de-duplication logic. */
  id: string;
  /** Shown in the undo banner, e.g. '"Oatmeal" deleted'. */
  message: string;
  /** Reverses the action. May be async; awaited by `undo()`. */
  restore: () => void | Promise<void>;
}

export interface PendingUndo {
  action: UndoAction;
  expiresAt: number;
}

export function createPendingUndo(action: UndoAction, nowMs: number, durationMs: number): PendingUndo {
  return { action, expiresAt: nowMs + durationMs };
}

export function isExpired(pending: PendingUndo, nowMs: number): boolean {
  return nowMs >= pending.expiresAt;
}

export interface UndoController {
  /** Replaces any currently pending action with this one. */
  schedule: (action: UndoAction, nowMs: number, durationMs: number) => void;
  /**
   * Attempts to restore the pending action. Clears the pending slot
   * synchronously *before* awaiting `restore()`, so a second call made while
   * the first is still in flight (e.g. a rapid double-tap) sees nothing
   * pending and returns false instead of restoring twice.
   */
  undo: (nowMs: number) => Promise<boolean>;
  /** Clears the pending action without restoring it. */
  dismiss: () => void;
  /** Returns the pending action, or null if none is pending or it has expired (expiry is lazily swept here). */
  getPending: (nowMs: number) => PendingUndo | null;
}

export function createUndoController(): UndoController {
  let pending: PendingUndo | null = null;

  return {
    schedule(action, nowMs, durationMs) {
      pending = createPendingUndo(action, nowMs, durationMs);
    },

    async undo(nowMs) {
      const current = pending;
      if (!current || isExpired(current, nowMs)) {
        pending = null;
        return false;
      }
      pending = null;
      await current.action.restore();
      return true;
    },

    dismiss() {
      pending = null;
    },

    getPending(nowMs) {
      if (pending && isExpired(pending, nowMs)) {
        pending = null;
      }
      return pending;
    },
  };
}
