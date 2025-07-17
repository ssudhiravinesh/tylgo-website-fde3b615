import { createContext, useContext, useState, ReactNode } from 'react';
import { useSound } from '@/hooks/useSound';
import { SuccessAnimation } from '@/components/ui/success-animation';

interface NotificationContextType {
  showSuccessAnimation: (message: string, type: 'customer' | 'quotation' | 'success') => void;
  playNotificationSound: (type: 'customerCreated' | 'quotationCreated' | 'quotationClosed') => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider = ({ children }: NotificationProviderProps) => {
  const { playChime } = useSound();
  const [animation, setAnimation] = useState<{
    isVisible: boolean;
    message: string;
    type: 'customer' | 'quotation' | 'success';
  }>({
    isVisible: false,
    message: '',
    type: 'customer',
  });

  const showSuccessAnimation = (message: string, type: 'customer' | 'quotation' | 'success') => {
    setAnimation({
      isVisible: true,
      message,
      type,
    });
  };

  const playNotificationSound = (type: 'customerCreated' | 'quotationCreated' | 'quotationClosed') => {
    playChime(type);
  };

  const handleAnimationComplete = () => {
    setAnimation(prev => ({ ...prev, isVisible: false }));
  };

  return (
    <NotificationContext.Provider
      value={{
        showSuccessAnimation,
        playNotificationSound,
      }}
    >
      {children}
      <SuccessAnimation
        isVisible={animation.isVisible}
        onComplete={handleAnimationComplete}
        message={animation.message}
        type={animation.type}
      />
    </NotificationContext.Provider>
  );
};