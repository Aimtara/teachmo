import { FocusEvent, ReactNode } from 'react';

type SkipLinkProps = {
  href?: string;
  children?: ReactNode;
};

export const SkipLink = ({ href = '#main-content', children = 'Skip to main content' }: SkipLinkProps) => {
  const handleFocus = (event: FocusEvent<HTMLAnchorElement>) => {
    event.currentTarget.classList.remove('sr-only');
  };

  const handleBlur = (event: FocusEvent<HTMLAnchorElement>) => {
    event.currentTarget.classList.add('sr-only');
  };

  return (
    <a
      href={href}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded focus:shadow-lg focus:no-underline"
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      {children}
    </a>
  );
};
