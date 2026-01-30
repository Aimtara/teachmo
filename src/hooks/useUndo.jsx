import { useRef, useCallback } from 'react';
import { toast } from 'sonner';

/**
 * useUndo provides a mechanism to perform an action with a temporary "Undo" window.
 * Usage:
 * const { performWithUndo } = useUndo();
 *
 * performWithUndo({
 *   message: 'Item deleted',
 *   action: () => deleteItem(id),
 *   undo: () => restoreItem(id),
 *   duration: 5000
 * });
 */
export function useUndo() {
  const timeoutRef = useRef(null);

  const performWithUndo = useCallback(({
    message,
    action,
    undo,
    duration = 4000,
    onComplete
  }) => {
    // 1. Immediately perform the optimistic update/action
    action();

    // 2. Show toast with Undo button
    const toastId = toast(message, {
      duration,
      action: {
        label: 'Undo',
        onClick: () => {
          // User clicked Undo
          undo();
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          toast.dismiss(toastId);
        }
      },
      onDismiss: (t) => {
        // Toast dismissed (timeout or manual), commit is final
        // In a real app, this might trigger the actual API call if we were purely optimistic
        if (t.dismissedByAction === false && onComplete) {
          onComplete();
        }
      }
    });
  }, []);

  return { performWithUndo };
}
