import { ToastItem, ToastType } from '@/types';
import { useState } from 'react';

export const useToast = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = (message: string, type: ToastType = 'success') => {
    const id = Date.now();
    const toast: ToastItem = { id, message, type, open: true };
    setToasts(prev => [...prev, toast]);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const closeToast = (id: number) => {
    setToasts(prev =>
      prev.map(toast =>
        toast.id === id ? { ...toast, open: false } : toast
      )
    );
  };

  return {
    toasts,
    addToast,
    removeToast,
    closeToast
  };
};
