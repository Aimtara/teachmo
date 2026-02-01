import { toast } from 'sonner';
import { RefreshCcw } from 'lucide-react';

export function useUndo() {
  const performWithUndo = (actionFn, undoFn, options = {}) => {
    const { message = "Action completed", duration = 5000 } = options;
    actionFn(); // Optimistic
    toast(message, {
      duration,
      action: { label: 'Undo', onClick: () => undoFn() },
      icon: <RefreshCcw className="w-4 h-4" />,
      cancel: { label: 'Dismiss' },
    });
  };
  return { performWithUndo };
}
