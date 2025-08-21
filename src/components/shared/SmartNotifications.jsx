import React, { createContext, useContext, useCallback } from 'react';
import { useToast } from "@/components/ui/use-toast";

const NotificationContext = createContext(null);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === null) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const { toast } = useToast();

  const addNotification = useCallback(({ title, message, type = 'default' }) => {
    // Map our internal type to shadcn's toast variants
    const variant = type === 'error' ? 'destructive' : 'default';
    
    toast({
      variant,
      title,
      description: message,
    });
  }, [toast]);

  const value = { addNotification };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};