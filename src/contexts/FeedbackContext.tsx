import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import { X, AlertCircle, CheckCircle, AlertTriangle, Info } from 'lucide-react';

// Pop-ups de feedback (toasts e confirmações) que substituem alert() e confirm() do navegador.
// Não confundir com NotificationContext, que gere as notificações guardadas na base de dados.

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: number;
  type: ToastType;
  title?: string;
  message: string;
}

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

interface FeedbackContextType {
  toast: Record<ToastType, (message: string, title?: string) => void>;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const FeedbackContext = createContext<FeedbackContextType | undefined>(undefined);

export const useFeedback = () => {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error('useFeedback must be used within a FeedbackProvider');
  }
  return context;
};

const TOAST_DURATION: Record<ToastType, number> = {
  success: 4000,
  info: 4000,
  warning: 6000,
  error: 6000
};

const TOAST_STYLES: Record<ToastType, { icon: React.ReactNode; container: string; title: string }> = {
  success: {
    icon: <CheckCircle className="text-green-600" size={22} />,
    container: 'border-green-500',
    title: 'Sucesso'
  },
  error: {
    icon: <AlertCircle className="text-red-600" size={22} />,
    container: 'border-red-500',
    title: 'Erro'
  },
  warning: {
    icon: <AlertTriangle className="text-yellow-600" size={22} />,
    container: 'border-yellow-500',
    title: 'Atenção'
  },
  info: {
    icon: <Info className="text-blue-600" size={22} />,
    container: 'border-blue-500',
    title: 'Informação'
  }
};

const CONFIRM_STYLES = {
  danger: {
    icon: <AlertTriangle className="text-red-600" size={28} />,
    iconBg: 'bg-red-100',
    button: 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
  },
  warning: {
    icon: <AlertTriangle className="text-yellow-600" size={28} />,
    iconBg: 'bg-yellow-100',
    button: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500'
  },
  info: {
    icon: <Info className="text-blue-600" size={28} />,
    iconBg: 'bg-blue-100',
    button: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
  }
};

const ToastCard: React.FC<{ toast: ToastItem; onClose: (id: number) => void }> = ({ toast, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => onClose(toast.id), TOAST_DURATION[toast.type]);
    return () => clearTimeout(timer);
  }, [toast.id, toast.type, onClose]);

  const style = TOAST_STYLES[toast.type];

  return (
    <div
      role={toast.type === 'error' ? 'alert' : 'status'}
      className={`pointer-events-auto w-full bg-white border-l-4 ${style.container} rounded-lg shadow-lg p-4 flex items-start gap-3 animate-slideIn`}
    >
      <div className="flex-shrink-0 mt-0.5">{style.icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900">{toast.title || style.title}</p>
        <p className="text-sm text-gray-700 mt-0.5 break-words whitespace-pre-line">{toast.message}</p>
      </div>
      <button
        onClick={() => onClose(toast.id)}
        className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="Fechar"
      >
        <X size={18} />
      </button>
    </div>
  );
};

interface ConfirmState extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

const ConfirmDialog: React.FC<{ state: ConfirmState; onClose: (value: boolean) => void }> = ({ state, onClose }) => {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const style = CONFIRM_STYLES[state.variant || 'danger'];

  useEffect(() => {
    cancelRef.current?.focus();
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4"
      onClick={() => onClose(false)}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        className="bg-white rounded-lg shadow-2xl max-w-md w-full animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-4 flex items-start gap-4">
          <div className={`flex-shrink-0 ${style.iconBg} rounded-full p-2`}>{style.icon}</div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">{state.title}</h2>
            {state.message && <p className="mt-2 text-gray-600 leading-relaxed">{state.message}</p>}
          </div>
        </div>
        <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end gap-3">
          <button
            ref={cancelRef}
            onClick={() => onClose(false)}
            className="px-4 py-2 rounded-lg font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
          >
            {state.cancelText || 'Cancelar'}
          </button>
          <button
            onClick={() => onClose(true)}
            className={`${style.button} text-white px-4 py-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2`}
          >
            {state.confirmText || 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export const FeedbackProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const nextId = useRef(0);
  const confirmRef = useRef<ConfirmState | null>(null);
  confirmRef.current = confirmState;

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((type: ToastType, message: string, title?: string) => {
    const id = ++nextId.current;
    setToasts((prev) => [...prev.slice(-4), { id, type, message, title }]);
  }, []);

  const toast = useMemo(() => ({
    success: (message: string, title?: string) => showToast('success', message, title),
    error: (message: string, title?: string) => showToast('error', message, title),
    warning: (message: string, title?: string) => showToast('warning', message, title),
    info: (message: string, title?: string) => showToast('info', message, title)
  }), [showToast]);

  const confirm = useCallback((options: ConfirmOptions) => {
    // Um novo pedido cancela o que estiver aberto
    confirmRef.current?.resolve(false);
    return new Promise<boolean>((resolve) => {
      setConfirmState({ ...options, resolve });
    });
  }, []);

  const closeConfirm = useCallback((value: boolean) => {
    confirmRef.current?.resolve(value);
    confirmRef.current = null;
    setConfirmState(null);
  }, []);

  const value = useMemo(() => ({ toast, confirm }), [toast, confirm]);

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="fixed top-4 right-4 left-4 sm:left-auto sm:w-96 z-[60] flex flex-col gap-3 pointer-events-none"
      >
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onClose={removeToast} />
        ))}
      </div>
      {confirmState && <ConfirmDialog state={confirmState} onClose={closeConfirm} />}
    </FeedbackContext.Provider>
  );
};
