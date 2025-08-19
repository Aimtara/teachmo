import React from 'react';

const Select = ({ children, value, onValueChange, disabled }) => {
  return (
    <div className="relative">
      {React.Children.map(children, child => 
        React.cloneElement(child, { value, onValueChange, disabled })
      )}
    </div>
  );
};

const SelectTrigger = React.forwardRef(({ className = '', children, value, onValueChange, disabled, ...props }, ref) => (
  <button
    type="button"
    ref={ref}
    className={[
      'flex h-10 w-full items-center justify-between rounded-md border border-input',
      'bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground',
      'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
      'disabled:cursor-not-allowed disabled:opacity-50',
      className
    ].filter(Boolean).join(' ')}
    disabled={disabled}
    {...props}
  >
    {children}
  </button>
));

const SelectValue = ({ placeholder, value }) => (
  <span className="block truncate">
    {value || placeholder}
  </span>
);

const SelectContent = ({ children, value, onValueChange }) => (
  <div className="absolute z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
    {React.Children.map(children, child => 
      React.cloneElement(child, { 
        onClick: () => onValueChange?.(child.props.value),
        isSelected: value === child.props.value
      })
    )}
  </div>
);

const SelectItem = ({ value, children, onClick, isSelected, className = '' }) => (
  <div
    className={[
      'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2',
      'text-sm outline-none focus:bg-accent focus:text-accent-foreground',
      'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      isSelected ? 'bg-accent text-accent-foreground' : '',
      className
    ].filter(Boolean).join(' ')}
    onClick={onClick}
  >
    {children}
  </div>
);

SelectTrigger.displayName = 'SelectTrigger';
SelectValue.displayName = 'SelectValue';
SelectContent.displayName = 'SelectContent';
SelectItem.displayName = 'SelectItem';

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };