import React from 'react';
import { Toaster, toast } from 'sonner';

type UltraMinimalToastProps = React.ComponentProps<typeof Toaster>;

type ToastOptions = Parameters<typeof toast>[1];

export function UltraMinimalToast(props: UltraMinimalToastProps) {
  return <Toaster position="top-right" closeButton richColors {...props} />;
}

export function showToast(message: string, options?: ToastOptions) {
  return toast(message, options);
}

export const ultraMinimalToast = {
  show: showToast,
  success: (message: string, options?: ToastOptions) => toast.success(message, options),
  error: (message: string, options?: ToastOptions) => toast.error(message, options),
  promise: toast.promise,
};

export default UltraMinimalToast;
