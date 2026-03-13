import { toast } from 'sonner';
import { RefreshCcw } from 'lucide-react';

type UndoOptions = {
  message?: string;
  duration?: number;
};

export function useUndo() {
  const performWithUndo = (
    actionFn: () => void,
    undoFn: () => void,
    options: UndoOptions = {},
  ) => {
    const { message = 'Action completed', duration = 5000 } = options;

    actionFn();

    toast(message, {
      duration,
      action: {
        label: 'Undo',
        onClick: () => undoFn(),
      },
      icon: <RefreshCcw className="w-4 h-4" />,
      cancel: {
        label: 'Dismiss',
      },
    });
  };

  return { performWithUndo };
}
