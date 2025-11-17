import React, { createContext, useContext, useState, useCallback } from "react";
import Toast from "./Toast";

type ToastMessage = {
  id: number;
  message: string;
  type: "success" | "info" | "error";
};

type ToastContextType = {
  addToast: (id: string, message: string, type?: ToastMessage["type"]) => void;
};

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback(
    (id = Date.now(), message: string, type: ToastMessage["type"] = "info") => {
      setToasts((prevToasts) => {
        const isToastAlreadyDisplayed = prevToasts.some(
          (toast) => toast.id === id,
        );
        if (!isToastAlreadyDisplayed) {
          return [...prevToasts, { id, message, type }];
        }
        return prevToasts;
      });
    },
    [],
  );

  const removeToast = useCallback((id: number) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed top-4 right-4 z-50 space-y-2 w-full max-w-sm">
        {toasts.map((toast, index) => (
          <Toast
            key={`${toast.id} - ${index}`}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
};
