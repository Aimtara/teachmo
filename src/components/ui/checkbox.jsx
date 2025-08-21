import * as React from "react";
import { Check } from "lucide-react";

const Checkbox = React.forwardRef(({ className, checked, onCheckedChange, disabled, ...props }, ref) => {
  const handleClick = () => {
    if (!disabled && onCheckedChange) {
      onCheckedChange(!checked);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      handleClick();
    }
  };
  
  const baseClasses = "peer h-4 w-4 shrink-0 rounded-sm border border-gray-300 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";
  const stateClasses = checked ? "bg-blue-600 text-white border-blue-600" : "bg-white";
  const finalClassName = [baseClasses, stateClasses, className].filter(Boolean).join(' ');

  return (
    <button
      ref={ref}
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={finalClassName}
      {...props}
    >
      {checked && (
        <Check className="h-4 w-4" />
      )}
    </button>
  );
});

Checkbox.displayName = "Checkbox";

export { Checkbox };