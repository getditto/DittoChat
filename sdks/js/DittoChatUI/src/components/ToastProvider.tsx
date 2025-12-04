/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useCallback, useRef } from "react";
import { Toaster, toast } from "sonner";

type ToastType = "success" | "info" | "error";

type ToastContextType = {
  addToast: (
    id: string | undefined,
    message: string,
    type?: ToastType
  ) => void;
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
  // Track displayed toast IDs to prevent duplicates
  const displayedToasts = useRef<Set<string>>(new Set());

  const addToast = useCallback(
    (
      id: string | undefined = Date.now().toString(),
      message: string,
      type: ToastType = "info"
    ) => {
      // Prevent duplicate toasts with the same ID
      if (displayedToasts.current.has(id)) {
        return;
      }

      displayedToasts.current.add(id);

      const toastOptions = {
        id,
        onDismiss: () => {
          displayedToasts.current.delete(id);
        },
        onAutoClose: () => {
          displayedToasts.current.delete(id);
        },
      };

      switch (type) {
        case "success":
          toast.success(message, toastOptions);
          break;
        case "error":
          toast.error(message, toastOptions);
          break;
        case "info":
        default:
          toast.info(message, toastOptions);
          break;
      }
    },
    []
  );

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          duration: 3000,
        }}
      />
    </ToastContext.Provider>
  );
};
