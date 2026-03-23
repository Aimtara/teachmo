import { useRef, useCallback } from 'react';
import { toast } from 'sonner';

type UndoOptions = {
  message: string;
  action: () => void | Promise<void>;
  undo: () => void | Promise<void>;
  duration?: number;
  onComplete?: () => void;
};

export function useUndo() {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const performWithUndo = useCallback(
    ({ message, action, undo, duration = 4000, onComplete }: UndoOptions) => {
      action();

      const toastId = toast(message, {
        duration,
        action: {
          label: 'Undo',
          onClick: () => {
            undo();
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            toast.dismiss(toastId);
          }
        },
        onDismiss: (t) => {
          if (t.dismissedByAction === false && onComplete) {
            onComplete();
          }
        }
      });
    },
    []
  );

  return { performWithUndo };
}
