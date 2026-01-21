import React from 'react';
import { Button } from './button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from './dialog';

const Modal = ({
  title,
  children,
  onClose,
  onConfirm,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
}) => {
  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose?.()}>
      <DialogContent>
        {title && (
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
        )}
        <div className="space-y-4">{children}</div>
        {(onClose || onConfirm) && (
          <DialogFooter>
            {onClose && (
              <Button type="button" variant="outline" onClick={onClose}>
                {cancelLabel}
              </Button>
            )}
            {onConfirm && (
              <Button type="button" variant="destructive" onClick={onConfirm}>
                {confirmLabel}
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

export { Modal };
