import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X, Loader2 } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'loading';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  action?: ToastAction;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number, action?: ToastAction) => string;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType>({
  showToast: () => '',
  dismissToast: () => {}
});

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timeoutsRef = useRef<Map<string, any>>(new Map());

  const dismissToast = useCallback((id: string) => {
    if (timeoutsRef.current.has(id)) {
      clearTimeout(timeoutsRef.current.get(id));
      timeoutsRef.current.delete(id);
    }
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((
    message: string, 
    type: ToastType = 'success', 
    duration?: number,
    action?: ToastAction
  ): string => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, type, message, action }]);

    const autoDuration = duration !== undefined ? duration : (type === 'loading' ? 0 : (type === 'error' ? 6000 : 3500));
    if (autoDuration > 0) {
      const timer = setTimeout(() => {
        dismissToast(id);
      }, autoDuration);
      timeoutsRef.current.set(id, timer);
    }

    return id;
  }, [dismissToast]);

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      {/* Floating Toast Container with high z-index and max width constraint */}
      <div className="fixed bottom-5 right-5 z-[1000] flex flex-col items-end gap-2.5 max-w-[calc(100vw-32px)] sm:max-w-md w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 16, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.94 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className={`pointer-events-auto w-full flex items-start gap-3 p-3.5 rounded-2xl shadow-xl border text-xs font-medium backdrop-blur-md transition-all ${
                toast.type === 'error'
                  ? 'bg-rose-500/95 text-white border-rose-600 shadow-rose-500/20'
                  : toast.type === 'info'
                  ? 'bg-slate-900/90 text-white border-slate-700 shadow-slate-900/30'
                  : toast.type === 'loading'
                  ? 'bg-slate-900/90 text-white border-slate-700 shadow-slate-900/30'
                  : 'bg-indigo-600/95 text-white border-indigo-500 shadow-indigo-600/25'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-white" />}
                {toast.type === 'info' && <Info className="w-4 h-4 text-indigo-300" />}
                {toast.type === 'loading' && <Loader2 className="w-4 h-4 text-indigo-300 animate-spin" />}
                {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-300" />}
              </div>

              <div className="flex-1 min-w-0">
                <p className="leading-relaxed break-words">{toast.message}</p>
                {toast.action && (
                  <button
                    onClick={() => {
                      toast.action?.onClick();
                      dismissToast(toast.id);
                    }}
                    className="mt-2 inline-flex items-center px-2.5 py-1 rounded-full bg-white/20 hover:bg-white/30 text-[11px] font-semibold text-white transition-colors cursor-pointer"
                  >
                    {toast.action.label}
                  </button>
                )}
              </div>

              <button
                onClick={() => dismissToast(toast.id)}
                className="mt-0.5 shrink-0 p-1 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
                title="关闭通知"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);

