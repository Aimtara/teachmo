import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/components/utils/cn';

const PopoverContext = React.createContext({});

const Popover = ({ children, onOpenChange, ...props }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const contentRef = useRef(null);

  const handleSetIsOpen = (open) => {
    setIsOpen(open);
    if (onOpenChange) {
      onOpenChange(open);
    }
  };

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        isOpen &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target) &&
        contentRef.current &&
        !contentRef.current.contains(event.target)
      ) {
        handleSetIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen, onOpenChange, triggerRef, contentRef]);

  const value = {
    isOpen,
    setIsOpen: handleSetIsOpen,
    position,
    setPosition,
    triggerRef,
    contentRef,
  };

  return (
    <PopoverContext.Provider value={value} {...props}>
      {children}
    </PopoverContext.Provider>
  );
};

const PopoverTrigger = React.forwardRef(({ className, children, asChild = false, ...props }, ref) => {
  const { setIsOpen, setPosition, triggerRef, isOpen } = React.useContext(PopoverContext);

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isOpen) {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (rect) {
        setPosition({
          top: rect.bottom + window.scrollY + 4,
          left: rect.left + window.scrollX,
        });
      }
    }
    setIsOpen(!isOpen);
  };

  const mergedRef = (node) => {
    triggerRef.current = node;
    if (typeof ref === 'function') {
      ref(node);
    } else if (ref) {
      ref.current = node;
    }
  };

  if (asChild) {
    return React.cloneElement(React.Children.only(children), {
      ref: mergedRef,
      onClick: handleClick,
      ...props,
    });
  }

  return (
    <button
      type="button"
      ref={mergedRef}
      className={className}
      onClick={handleClick}
      {...props}
    >
      {children}
    </button>
  );
});

const PopoverContent = React.forwardRef(({ className, align = 'center', children, ...props }, ref) => {
  const { isOpen, setIsOpen, position, contentRef } = React.useContext(PopoverContext);

  const mergedRef = (node) => {
    contentRef.current = node;
    if (typeof ref === 'function') {
      ref(node);
    } else if (ref) {
      ref.current = node;
    }
  };

  // Close the popover when an item inside is clicked
  const handleContentClick = (e) => {
    // Check if the click is on a button or a role that implies an action
    if (e.target.closest('button, [role="option"], [role="menuitem"]')) {
       setIsOpen(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return createPortal(
    <div
      ref={mergedRef}
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
      className={cn(
        'absolute z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none',
        'animate-in data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
        className
      )}
      onClickCapture={handleContentClick}
      {...props}
    >
      {children}
    </div>,
    document.body
  );
});

PopoverContent.displayName = 'PopoverContent';
PopoverTrigger.displayName = 'PopoverTrigger';

export { Popover, PopoverTrigger, PopoverContent };