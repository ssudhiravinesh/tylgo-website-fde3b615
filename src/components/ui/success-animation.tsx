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
        return 'from-blue-400 via-purple-500 to-pink-500';
      case 'quotation':
        return 'from-green-400 via-blue-500 to-purple-500';
      case 'success':
        return 'from-emerald-400 via-teal-500 to-cyan-500';
      default:
        return 'from-blue-400 via-purple-500 to-pink-500';
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      {/* Backdrop with glassmorphism */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-md" />
      
      {/* Animated container */}
      <div className="relative z-10 flex flex-col items-center justify-center space-y-6">
        {/* Animated particles */}
        <div className="absolute inset-0 -m-20">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className={`absolute w-2 h-2 rounded-full bg-gradient-to-r ${getGradientColors()} animate-ping`}
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${i * 0.1}s`,
                animationDuration: `${1 + Math.random()}s`,
              }}
            />
          ))}
        </div>

        {/* Success check icon with neumorphism */}
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-white to-gray-100 shadow-[8px_8px_16px_rgba(0,0,0,0.1),-8px_-8px_16px_rgba(255,255,255,0.8)] flex items-center justify-center animate-[bounce_0.6s_ease-in-out_0.2s_both] transform scale-0">
            <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${getGradientColors()} flex items-center justify-center shadow-inner animate-[spin_0.8s_ease-in-out_0.4s_both]`}>
              <Check className="w-8 h-8 text-white animate-[scale-in_0.3s_ease-in-out_0.8s_both] transform scale-0" />
            </div>
          </div>
          
          {/* Ripple effect */}
          <div className={`absolute inset-0 rounded-full bg-gradient-to-r ${getGradientColors()} opacity-20 animate-[ripple_1s_ease-out_0.5s_both]`} />
        </div>

        {/* Message with glassmorphism */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl px-8 py-4 shadow-xl border border-white/20 animate-[fade-in_0.5s_ease-in-out_1s_both] opacity-0">
          <p className="text-lg font-semibold text-white text-center drop-shadow-lg">
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
      opacity: 0.7;
    }
    100% {
      transform: scale(3);
      opacity: 0;
    }
  }
  
  @keyframes scale-in {
    0% {
      transform: scale(0);
    }
    100% {
      transform: scale(1);
    }
  }
  
  @keyframes fade-in {
    0% {
      opacity: 0;
      transform: translateY(20px);
    }
    100% {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;
document.head.appendChild(style);