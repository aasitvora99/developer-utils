import { ToastComponentProps, ToastProviderProps } from '@/types';
import * as Toast from '@radix-ui/react-toast';
import { AlertCircle, CheckCircle, X } from "lucide-react";


// Toast Provider - wrap your app with this
export const ToastProvider = ({ children }: ToastProviderProps) => {
  return (
    <Toast.Provider swipeDirection="right">
      {children}
      <Toast.Viewport className="fixed bottom-0 right-0 flex flex-col p-4 gap-2 w-96 max-w-[100vw] m-0 list-none z-50 outline-none" />

    </Toast.Provider>
  );
};

// Individual Toast Component
export const ToastComponent = ({
  message,
  type = 'success',
  open,
  onOpenChange
}: ToastComponentProps) => {
  const icons: Record<'success' | 'error' | 'warning', JSX.Element> = {
    success: <CheckCircle className="h-5 w-5" />,
    error: <AlertCircle className="h-5 w-5" />,
    warning: <AlertCircle className="h-5 w-5" />
  };

  const colors: Record<'success' | 'error' | 'warning', string> = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-yellow-500'
  };

  return (
    <Toast.Root
      className={`${colors[type]} text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3
        data-[state=open]:animate-in data-[state=closed]:animate-out
        data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)]
        data-[swipe=cancel]:translate-x-0 data-[swipe=end]:animate-out
        data-[state=open]:slide-in-from-top-full data-[state=closed]:slide-out-to-right-full
      `}
      open={open}
      onOpenChange={onOpenChange}
      duration={3000}
    >
      {icons[type]}
      <Toast.Description className="font-medium flex-1">
        {message}
      </Toast.Description>
      <Toast.Close className="ml-2 hover:bg-white/20 rounded p-1">
        <X className="h-4 w-4" />
      </Toast.Close>
    </Toast.Root>
  );
};
