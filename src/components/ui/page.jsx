import React from 'react';
import { cn } from '@/lib/utils';

const Page = ({ title, children, className }) => {
  return (
    <div className={cn('mx-auto flex w-full max-w-6xl flex-col gap-4 p-6', className)}>
      {title && <h1 className="text-2xl font-semibold">{title}</h1>}
      {children}
    </div>
  );
};

export { Page };
