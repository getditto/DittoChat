import { toast as sonnerToast } from 'sonner';

interface ToastProps {
  title: string;
  description: string;
}

export function toast(toastData: ToastProps) {
  return sonnerToast.message(toastData.title, {
    description: toastData.description,
  });
}

export { Toaster as DittoToaster } from 'sonner';