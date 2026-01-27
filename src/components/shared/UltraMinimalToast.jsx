import PropTypes from 'prop-types';
import { Toaster, toast } from 'sonner';

export function UltraMinimalToast(props) {
  return <Toaster position="top-right" closeButton richColors {...props} />;
}

UltraMinimalToast.propTypes = {
  position: PropTypes.string
};

export function showToast(message, options) {
  return toast(message, options);
}

export const ultraMinimalToast = {
  show: showToast,
  success: (message, options) => toast.success(message, options),
  error: (message, options) => toast.error(message, options),
  promise: toast.promise
};

export default UltraMinimalToast;
