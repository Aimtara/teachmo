import React, { createContext, useContext, useEffect, useState } from 'react';

type TypingContextValue = { typingUserIds: Set<string> };

const TypingContext = createContext<TypingContextValue>({ typingUserIds: new Set() });

export const TypingIndicatorProvider = ({ children }: { children: React.ReactNode }) => {
  const [typingUserIds, setTypingUserIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const handleTyping = (event: CustomEvent<{ senderId: string }>) => {
      setTypingUserIds((prev) => {
        const updated = new Set(prev);
        updated.add(event.detail.senderId);
        return updated;
      });

      window.setTimeout(() => {
        setTypingUserIds((prev) => {
          const updated = new Set(prev);
          updated.delete(event.detail.senderId);
          return updated;
        });
      }, 3000);
    };

    window.addEventListener('userTyping', handleTyping as EventListener);
    return () => window.removeEventListener('userTyping', handleTyping as EventListener);
  }, []);

  return <TypingContext.Provider value={{ typingUserIds }}>{children}</TypingContext.Provider>;
};

export const useTypingIndicator = () => useContext(TypingContext);
