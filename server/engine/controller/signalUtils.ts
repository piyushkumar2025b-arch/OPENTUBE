/**
 * AbortSignal Combination & Propagation Utility
 * Guarantees that when either an internal timeout expires OR an upstream parent signal
 * (e.g. from the client HTTP request cancellation or worker queue) aborts,
 * the resulting signal fires immediately, stopping all underlying fetch() sockets.
 */

export interface CombinedSignalResult {
  signal: AbortSignal;
  cleanup: () => void;
}

export function createCombinedSignal(
  timeoutMs: number,
  parentSignal?: AbortSignal
): CombinedSignalResult {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort(new Error(`Timeout of ${timeoutMs}ms exceeded`));
  }, timeoutMs);

  let onParentAbort: (() => void) | null = null;

  if (parentSignal) {
    if (parentSignal.aborted) {
      clearTimeout(timeoutId);
      controller.abort(parentSignal.reason || new Error('Parent signal already aborted'));
    } else {
      onParentAbort = () => {
        clearTimeout(timeoutId);
        controller.abort(parentSignal.reason || new Error('Parent operation aborted'));
      };
      parentSignal.addEventListener('abort', onParentAbort, { once: true });
    }
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timeoutId);
      if (parentSignal && onParentAbort) {
        parentSignal.removeEventListener('abort', onParentAbort);
      }
    },
  };
}
