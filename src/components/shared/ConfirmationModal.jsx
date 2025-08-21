import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Trash2, LogOut, Shield, Zap } from 'lucide-react';

const CONFIRMATION_TYPES = {
  destructive: {
    icon: AlertTriangle,
    iconColor: 'text-red-500',
    confirmButtonVariant: 'destructive',
    confirmText: 'Delete',
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-yellow-500',
    confirmButtonVariant: 'default',
    confirmText: 'Continue',
  },
  logout: {
    icon: LogOut,
    iconColor: 'text-gray-500',
    confirmButtonVariant: 'outline',
    confirmText: 'Sign Out',
  },
  emergency: {
    icon: Shield,
    iconColor: 'text-red-600',
    confirmButtonVariant: 'destructive',
    confirmText: 'Send Alert',
  },
  action: {
    icon: Zap,
    iconColor: 'text-blue-500',
    confirmButtonVariant: 'default',
    confirmText: 'Confirm',
  },
};

export default function ConfirmationModal({
  open,
  onOpenChange,
  title,
  description,
  type = 'warning',
  confirmText,
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  isLoading = false,
  requiresDoubleConfirm = false,
  doubleConfirmText = '',
  children
}) {
  const [doubleConfirmInput, setDoubleConfirmInput] = React.useState('');
  
  const config = CONFIRMATION_TYPES[type] || CONFIRMATION_TYPES.warning;
  const Icon = config.icon;
  
  const handleConfirm = () => {
    if (requiresDoubleConfirm && doubleConfirmInput !== doubleConfirmText) {
      return;
    }
    onConfirm?.();
  };

  const handleCancel = () => {
    setDoubleConfirmInput('');
    onCancel?.();
    onOpenChange?.(false);
  };

  const isDoubleConfirmValid = !requiresDoubleConfirm || doubleConfirmInput === doubleConfirmText;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-full bg-gray-100 ${config.iconColor}`}>
              <Icon className="w-6 h-6" />
            </div>
            <DialogTitle className="text-lg font-semibold">
              {title}
            </DialogTitle>
          </div>
          {description && (
            <DialogDescription className="text-gray-600 text-base">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>

        {children}

        {requiresDoubleConfirm && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Type "{doubleConfirmText}" to confirm:
            </label>
            <input
              type="text"
              value={doubleConfirmInput}
              onChange={(e) => setDoubleConfirmInput(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={doubleConfirmText}
              autoComplete="off"
            />
          </div>
        )}

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            variant={config.confirmButtonVariant}
            onClick={handleConfirm}
            disabled={isLoading || !isDoubleConfirmValid}
            className="min-w-[100px]"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Loading...
              </div>
            ) : (
              confirmText || config.confirmText
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Preset confirmation modals for common actions
export const DeleteConfirmation = ({ open, onOpenChange, onConfirm, itemName, ...props }) => (
  <ConfirmationModal
    open={open}
    onOpenChange={onOpenChange}
    type="destructive"
    title={`Delete ${itemName}?`}
    description={`This action cannot be undone. The ${itemName.toLowerCase()} will be permanently removed.`}
    confirmText="Delete"
    onConfirm={onConfirm}
    {...props}
  />
);

export const LogoutConfirmation = ({ open, onOpenChange, onConfirm, ...props }) => (
  <ConfirmationModal
    open={open}
    onOpenChange={onOpenChange}
    type="logout"
    title="Sign Out?"
    description="You will need to sign in again to access your account."
    confirmText="Sign Out"
    onConfirm={onConfirm}
    {...props}
  />
);

export const EmergencyConfirmation = ({ open, onOpenChange, onConfirm, alertType, ...props }) => (
  <ConfirmationModal
    open={open}
    onOpenChange={onOpenChange}
    type="emergency"
    title={`Send ${alertType} Alert?`}
    description="This will immediately notify all relevant parties. Only use in genuine emergencies."
    confirmText="Send Alert"
    onConfirm={onConfirm}
    requiresDoubleConfirm={true}
    doubleConfirmText="EMERGENCY"
    {...props}
  />
);