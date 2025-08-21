import * as React from "react";

const ScrollArea = React.forwardRef(({ className, children, ...props }, ref) => {
  const baseClasses = "relative overflow-hidden";
  const finalClassName = className ? `${baseClasses} ${className}` : baseClasses;

  return (
    <div
      ref={ref}
      className={finalClassName}
      {...props}
    >
      <div className="h-full w-full overflow-y-auto overflow-x-hidden rounded-[inherit]">
        {children}
      </div>
    </div>
  );
});

ScrollArea.displayName = "ScrollArea";

const ScrollBar = React.forwardRef(({ className, orientation = "vertical", ...props }, ref) => {
  // This is a simplified version - the actual scrollbar styling is handled by the browser
  return null;
});

ScrollBar.displayName = "ScrollBar";

export { ScrollArea, ScrollBar };