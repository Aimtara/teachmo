import type { ReactNode } from 'react';

type ReactMarkdownProps = {
  children?: ReactNode;
};

export default function ReactMarkdown({ children }: ReactMarkdownProps) {
  return <>{children}</>;
}
