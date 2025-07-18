import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { createPortal } from 'react-dom';

interface SuccessAnimationProps {
  isVisible: boolean;
  onComplete: () => void;
  message: string;
  type: 'customer' | 'quotation' | 'success';
}

export const SuccessAnimation = ({ isVisible, onComplete, message, type }: SuccessAnimationProps) => {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
      const timer = setTimeout(() => {
        setShouldRender(false);
        onComplete();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onComplete]);

  if (!shouldRender) return null;

  const getGradientColors = () => {
    switch (type) {
      case 'customer':
        return 'from-blue-400 via-blue-500 to-blue-600';
      case 'quotation':
        return 'from-blue-400 via-slate-500 to-amber-200';
      case 'success':
        return 'from-blue-500 via-blue-600 to-amber-100';
      default:
        return 'from-blue-400 via-blue-500 to-blue-600';
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      {/* Backdrop with glassmorphism */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-md" />
      
      {/* Animated container */}
      <div className="relative z-10 flex flex-col items-center justify-center space-y-6">
        {/* Animated particles */}
        <div className="absolute inset-0 -m-32">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full opacity-80 animate-[sparkle_3s_ease-in-out_infinite]"
              style={{
                width: `${Math.random() * 8 + 4}px`,
                height: `${Math.random() * 8 + 4}px`,
                background: i % 3 === 0 ? '#3B82F6' : i % 3 === 1 ? '#60A5FA' : '#FEF3E2',
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${i * 0.15}s`,
                animationDuration: `${2 + Math.random()}s`,
                boxShadow: i % 3 === 2 ? '0 0 10px rgba(251, 191, 36, 0.6)' : '0 0 10px rgba(59, 130, 246, 0.5)',
              }}
            />
          ))}
        </div>

        {/* Success check icon with enhanced neumorphism */}
        <div className="relative">
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-50 to-amber-50 shadow-[12px_12px_24px_rgba(0,0,0,0.15),-12px_-12px_24px_rgba(255,255,255,0.9)] flex items-center justify-center animate-[bounce_0.8s_ease-in-out_0.2s_both] transform scale-0">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-100 to-amber-100 shadow-[inset_6px_6px_12px_rgba(0,0,0,0.1),inset_-6px_-6px_12px_rgba(255,255,255,0.8)] flex items-center justify-center">
              <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${getGradientColors()} flex items-center justify-center shadow-lg animate-[spin_1s_ease-in-out_0.4s_both]`}>
                <Check className="w-10 h-10 text-white animate-[scale-in_0.5s_ease-in-out_0.8s_both] transform scale-0 drop-shadow-lg" strokeWidth={4} />
              </div>
            </div>
          </div>
          
          {/* Multiple ripple effects */}
          <div className="absolute inset-0 rounded-full bg-blue-400 opacity-30 animate-[ripple_2s_ease-out_0.5s_both]" />
          <div className="absolute inset-2 rounded-full bg-amber-200 opacity-25 animate-[ripple_2.5s_ease-out_0.8s_both]" />
        </div>

        {/* Message with enhanced glassmorphism */}
        <div className="bg-gradient-to-r from-blue-50/80 to-amber-50/80 backdrop-blur-lg rounded-3xl px-10 py-6 shadow-2xl border-2 border-blue-200/30 animate-[fade-in_0.8s_ease-in-out_1.2s_both] opacity-0">
          <h3 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent text-center mb-2 drop-shadow-sm">
            Success!
          </h3>
          <p className="text-lg font-medium text-gray-700 text-center leading-relaxed">
            {message}
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
};

// Add custom keyframes to the component
const style = document.createElement('style');
style.textContent = `
  @keyframes ripple {
    0% {
      transform: scale(0);
      opacity: 0.8;
    }
    100% {
      transform: scale(4);
      opacity: 0;
    }
  }
  
  @keyframes scale-in {
    0% {
      transform: scale(0) rotate(-180deg);
      opacity: 0;
    }
    50% {
      transform: scale(1.2) rotate(-90deg);
      opacity: 0.8;
    }
    100% {
      transform: scale(1) rotate(0deg);
      opacity: 1;
    }
  }
  
  @keyframes fade-in {
    0% {
      opacity: 0;
      transform: translateY(30px) scale(0.9);
    }
    100% {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
  
  @keyframes sparkle {
    0%, 100% {
      opacity: 0.3;
      transform: scale(0.8) translateY(0px);
    }
    50% {
      opacity: 1;
      transform: scale(1.3) translateY(-10px);
    }
  }
`;
document.head.appendChild(style);