import {
  cloneElement,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ElementType,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from 'react';

type AsProp = ElementType;

type ScreenReaderOnlyProps = {
  children: ReactNode;
  as?: AsProp;
};

export const ScreenReaderOnly = ({ children, as: Component = 'span' }: ScreenReaderOnlyProps) => (
  <Component className="sr-only">{children}</Component>
);

type VisuallyHiddenProps = {
  children: ReactNode;
  focusable?: boolean;
};

export const VisuallyHidden = ({ children, focusable = false }: VisuallyHiddenProps) => (
  <span
    className={`absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0 ${
      focusable
        ? 'focus:not-sr-only focus:w-auto focus:h-auto focus:p-2 focus:m-0 focus:overflow-visible focus:whitespace-normal focus:border focus:border-gray-300 focus:bg-white focus:text-black focus:z-50'
        : ''
    }`}
    style={{ clip: 'rect(0, 0, 0, 0)', clipPath: 'inset(50%)' }}
  >
    {children}
  </span>
);

type KeyboardNavigationOptions = {
  circular?: boolean;
  autoFocus?: boolean;
};

type FocusableRef = RefObject<HTMLElement | null>;

export const useKeyboardNavigation = (refs: FocusableRef[], options: KeyboardNavigationOptions = {}) => {
  const { circular = true, autoFocus = false } = options;

  useEffect(() => {
    if (autoFocus && refs[0]?.current) {
      refs[0].current.focus();
    }
  }, [refs, autoFocus]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent, currentIndex: number) => {
      const { key } = event;

      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(key)) {
        return;
      }

      event.preventDefault();

      let nextIndex: number;

      switch (key) {
        case 'ArrowDown':
        case 'ArrowRight':
          nextIndex = currentIndex + 1;
          if (nextIndex >= refs.length) {
            nextIndex = circular ? 0 : refs.length - 1;
          }
          break;
        case 'ArrowUp':
        case 'ArrowLeft':
          nextIndex = currentIndex - 1;
          if (nextIndex < 0) {
            nextIndex = circular ? refs.length - 1 : 0;
          }
          break;
        case 'Home':
          nextIndex = 0;
          break;
        case 'End':
          nextIndex = refs.length - 1;
          break;
        default:
          return;
      }

      refs[nextIndex]?.current?.focus();
    },
    [refs, circular],
  );

  return { handleKeyDown };
};

export const useRovingTabIndex = (items: unknown[], activeIndex = 0) => {
  const [currentIndex, setCurrentIndex] = useState(activeIndex);

  const getTabIndex = useCallback((index: number) => (index === currentIndex ? 0 : -1), [currentIndex]);

  const setActiveIndex = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  return { getTabIndex, setActiveIndex, currentIndex, items };
};

export const useFocusManagement = () => {
  const focusStack = useRef<Array<Element | null>>([]);

  const pushFocus = useCallback((element?: HTMLElement | null) => {
    focusStack.current.push(document.activeElement);
    element?.focus();
  }, []);

  const popFocus = useCallback(() => {
    const previousElement = focusStack.current.pop();
    if (previousElement instanceof HTMLElement) {
      previousElement.focus();
    }
  }, []);

  const trapFocus = useCallback((containerRef: RefObject<HTMLElement | null>) => {
    const container = containerRef.current;
    if (!container) return;

    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    firstElement?.focus();

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return { pushFocus, popFocus, trapFocus };
};

export const useLiveRegion = () => {
  const liveRegionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!liveRegionRef.current) {
      const liveRegion = document.createElement('div');
      liveRegion.setAttribute('aria-live', 'polite');
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.className = 'sr-only';
      document.body.appendChild(liveRegion);
      liveRegionRef.current = liveRegion;
    }

    return () => {
      if (liveRegionRef.current && document.body.contains(liveRegionRef.current)) {
        document.body.removeChild(liveRegionRef.current);
      }
    };
  }, []);

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (!liveRegionRef.current) return;

    liveRegionRef.current.setAttribute('aria-live', priority);
    liveRegionRef.current.textContent = message;

    window.setTimeout(() => {
      if (liveRegionRef.current) {
        liveRegionRef.current.textContent = '';
      }
    }, 1000);
  }, []);

  return { announce };
};

export const useAccessibleDialog = (isOpen: boolean) => {
  const dialogRef = useRef<HTMLElement | null>(null);
  const previousActiveElement = useRef<Element | null>(null);
  const { trapFocus } = useFocusManagement();

  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement;
      const cleanup = trapFocus(dialogRef);
      document.body.style.overflow = 'hidden';

      return () => {
        cleanup?.();
        document.body.style.overflow = '';
        if (previousActiveElement.current instanceof HTMLElement) {
          previousActiveElement.current.focus();
        }
      };
    }
  }, [isOpen, trapFocus]);

  const handleEscape = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
    }
  }, []);

  return { dialogRef, handleEscape };
};

type AccessibleFormFieldProps = {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactElement;
  id?: string;
} & Record<string, unknown>;

export const AccessibleFormField = ({
  label,
  error,
  hint,
  required = false,
  children,
  id,
  ...props
}: AccessibleFormFieldProps) => {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const errorId = error ? `${fieldId}-error` : undefined;
  const hintId = hint ? `${fieldId}-hint` : undefined;

  const describedBy = [errorId, hintId].filter(Boolean).join(' ');

  return (
    <div className="space-y-2">
      <label htmlFor={fieldId} className="block text-sm font-medium text-gray-700">
        {label}
        {required && (
          <span className="text-red-500 ml-1" aria-label="required">
            *
          </span>
        )}
      </label>

      {hint && (
        <p id={hintId} className="text-sm text-gray-600">
          {hint}
        </p>
      )}

      {cloneElement(children, {
        id: fieldId,
        'aria-describedby': describedBy || undefined,
        'aria-invalid': error ? 'true' : undefined,
        'aria-required': required,
        ...props,
      })}

      {error && (
        <p id={errorId} role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
};

type AccessibleButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  isLoading?: boolean;
  loadingText?: string;
};

export const AccessibleButton = ({ children, isLoading, loadingText = 'Loading...', ...props }: AccessibleButtonProps) => (
  <button {...props} disabled={isLoading || props.disabled} aria-disabled={isLoading || props.disabled}>
    {isLoading ? (
      <>
        <ScreenReaderOnly>{loadingText}</ScreenReaderOnly>
        <span aria-hidden="true">{children}</span>
      </>
    ) : (
      children
    )}
  </button>
);

type SkipLinkProps = {
  href?: string;
  children?: ReactNode;
};

export const SkipLink = ({ href = '#main-content', children = 'Skip to main content' }: SkipLinkProps) => (
  <a
    href={href}
    className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded focus:shadow-lg focus:no-underline"
  >
    {children}
  </a>
);

export const useHighContrast = () => {
  const [isHighContrast, setIsHighContrast] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');

    setIsHighContrast(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => setIsHighContrast(e.matches);
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return isHighContrast;
};

export const useReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
};
