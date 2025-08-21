import * as React from "react";

const Progress = React.forwardRef(({ className, value, max = 100, ...props }, ref) => {
  const percentage = Math.min(Math.max((value || 0) / max * 100, 0), 100);
  
  // Combine classes manually to avoid any utility function conflicts
  const baseClasses = "relative h-2 w-full overflow-hidden rounded-full bg-gray-200";
  const finalClassName = className ? `${baseClasses} ${className}` : baseClasses;

  return (
    <div
      ref={ref}
      className={finalClassName}
      {...props}
    >
      <div
        className="h-full w-full flex-1 bg-blue-600 transition-all"
        style={{ transform: `translateX(-${100 - percentage}%)` }}
      />
    </div>
  );
});

Progress.displayName = "Progress";

export { Progress };