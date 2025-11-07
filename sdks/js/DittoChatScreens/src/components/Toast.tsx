import React, { useEffect, useState } from 'react';
import { Icons } from './Icons';

interface ToastProps {
  message: string;
  type: 'success' | 'info' | 'error';
  onClose: () => void;
}

const toastConfig = {
  success: {
    icon: Icons.checkCircle,
    bgClass: 'bg-[rgb(var(--success-bg))]',
    textClass: 'text-[rgb(var(--success-text))]',
    iconClass: 'text-[rgb(var(--active-status-bg))]'
  },
  info: {
    icon: Icons.info,
    bgClass: 'bg-[rgb(var(--edit-bg))]',
    textClass: 'text-[rgb(var(--edit-text))]',
    iconClass: 'text-[rgb(var(--info-icon-color))]'
  },
  error: {
    icon: Icons.x,
    bgClass: 'bg-[rgb(var(--danger-bg))]',
    textClass: 'text-[rgb(var(--danger-text))]',
    iconClass: 'text-[rgb(var(--danger-text))]'
  }
};

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300); // Wait for fade out animation
    }, 3000);

    return () => {
      clearTimeout(timer);
    };
  }, [onClose]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };
  
  const config = toastConfig[type];
  const Icon = config.icon;

  return (
    <div
      className={`max-w-sm w-full rounded-lg shadow-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden transition-all duration-300 ease-in-out transform ${config.bgClass} ${visible ? 'animate-slide-in' : 'animate-fade-out'}`}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <Icon className={`h-6 w-6 ${config.iconClass}`} aria-hidden="true" />
          </div>
          <div className="ml-3 w-0 flex-1 pt-0.5">
            <p className={`text-sm font-medium ${config.textClass}`}>
              {message}
            </p>
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button
              onClick={handleClose}
              className={`inline-flex rounded-md p-1 ${config.textClass} opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[rgb(var(--primary-color-focus))]`}
            >
              <span className="sr-only">Close</span>
              <Icons.x className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
       <style>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out forwards;
        }

        @keyframes fade-out {
          from {
            opacity: 1;
          }
          to {
            opacity: 0;
          }
        }
        .animate-fade-out {
          animation: fade-out 0.3s ease-in forwards;
        }
      `}</style>
    </div>
  );
};

export default Toast;