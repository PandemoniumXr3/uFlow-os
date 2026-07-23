import { describe, expect, it, vi } from 'vitest';

import { createUndoController } from '@/services/undo/undoStore';

describe('createUndoController', () => {
  it('restores the pending action when undo is called before expiry', async () => {
    const controller = createUndoController();
    const restore = vi.fn();
    controller.schedule({ id: 'a', message: 'Deleted A', restore }, 1000, 5000);

    const result = await controller.undo(2000);

    expect(result).toBe(true);
    expect(restore).toHaveBeenCalledTimes(1);
  });

  it('returns false and does not call restore once expired', async () => {
    const controller = createUndoController();
    const restore = vi.fn();
    controller.schedule({ id: 'a', message: 'Deleted A', restore }, 1000, 5000);

    const result = await controller.undo(1000 + 5000 + 1);

    expect(result).toBe(false);
    expect(restore).not.toHaveBeenCalled();
  });

  it('getPending returns null once the action has expired, without calling undo', () => {
    const controller = createUndoController();
    controller.schedule({ id: 'a', message: 'Deleted A', restore: vi.fn() }, 1000, 5000);

    expect(controller.getPending(3000)).not.toBeNull();
    expect(controller.getPending(6001)).toBeNull();
  });

  it('scheduling a second action replaces the first — only the second is ever restorable', async () => {
    const controller = createUndoController();
    const restoreA = vi.fn();
    const restoreB = vi.fn();
    controller.schedule({ id: 'a', message: 'Deleted A', restore: restoreA }, 1000, 5000);
    controller.schedule({ id: 'b', message: 'Deleted B', restore: restoreB }, 1200, 5000);

    const result = await controller.undo(1500);

    expect(result).toBe(true);
    expect(restoreA).not.toHaveBeenCalled();
    expect(restoreB).toHaveBeenCalledTimes(1);
  });

  it('does not restore twice on a rapid double-undo, even with an async restore', async () => {
    const controller = createUndoController();
    let resolveRestore: () => void = () => {};
    const restore = vi.fn(() => new Promise<void>((resolve) => (resolveRestore = resolve)));
    controller.schedule({ id: 'a', message: 'Deleted A', restore }, 1000, 5000);

    const first = controller.undo(1500);
    const second = controller.undo(1500);
    resolveRestore();
    const [firstResult, secondResult] = await Promise.all([first, second]);

    expect(restore).toHaveBeenCalledTimes(1);
    expect([firstResult, secondResult].filter(Boolean)).toHaveLength(1);
  });

  it('dismiss clears the pending action without restoring it', async () => {
    const controller = createUndoController();
    const restore = vi.fn();
    controller.schedule({ id: 'a', message: 'Deleted A', restore }, 1000, 5000);

    controller.dismiss();
    const result = await controller.undo(1500);

    expect(result).toBe(false);
    expect(restore).not.toHaveBeenCalled();
  });

  it('undo with nothing scheduled returns false', async () => {
    const controller = createUndoController();
    const result = await controller.undo(1000);
    expect(result).toBe(false);
  });
});
