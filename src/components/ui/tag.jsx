import React from 'react';
import { cn } from '@/lib/utils';

const Tag = React.forwardRef(({ className, variant = 'default', ...props }, ref) => {
  const variants = {
    default: 'bg-primary/10 text-primary',
    secondary: 'bg-secondary text-secondary-foreground',
    outline: 'border border-input text-foreground',
  };

  return (
    <span
      ref={ref}
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium',
        variants[variant],
        className
      )}
      {...props}
    />
  );
});

Tag.displayName = 'Tag';

export { Tag };
