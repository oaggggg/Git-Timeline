import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Loader2 } from 'lucide-react';

export interface ConfirmActionModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  badge?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary';
  icon?: React.ReactNode;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmActionModal: React.FC<ConfirmActionModalProps> = ({
  isOpen,
  title,
  description,
  badge,
  confirmLabel = '确定',
  cancelLabel = '取消',
  variant = 'warning',
  icon,
  isLoading = false,
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onCancel]);

  if (typeof document === 'undefined') return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          iconBg: 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400',
          badgeBg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40',
          btnBg: 'bg-rose-600 hover:bg-rose-700 text-white',
        };
      case 'warning':
        return {
          iconBg: 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400',
          badgeBg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40',
          btnBg: 'bg-amber-600 hover:bg-amber-700 text-white',
        };
      default:
        return {
          iconBg: 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400',
          badgeBg: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/40',
          btnBg: 'bg-indigo-600 hover:bg-indigo-700 text-white',
        };
    }
  };

  const styles = getVariantStyles();

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs"
          onClick={() => !isLoading && onCancel()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-sm bg-white dark:bg-[#161b22] rounded-3xl shadow-2xl border border-slate-200/80 dark:border-[#30363d] overflow-hidden p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex flex-col items-center text-center">
              <div className={`w-12 h-12 rounded-2xl ${styles.iconBg} flex items-center justify-center mb-3 shadow-xs`}>
                {icon || <AlertTriangle className="w-6 h-6" />}
              </div>

              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {title}
              </h3>

              <p className="text-xs text-slate-500 dark:text-[#8b949e] mt-2 leading-relaxed">
                {description}
              </p>

              {badge && (
                <div className={`mt-3 px-3 py-1 rounded-full text-[11px] font-medium ${styles.badgeBg}`}>
                  {badge}
                </div>
              )}

              <div className="flex items-center gap-2.5 w-full mt-6">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={onCancel}
                  className="flex-1 py-2 rounded-full border border-slate-200 dark:border-[#30363d] text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#21262d] transition-colors disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {cancelLabel}
                </button>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  type="button"
                  disabled={isLoading}
                  onClick={onConfirm}
                  className={`flex-1 py-2 rounded-full text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-1.5 ${styles.btnBg} disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer`}
                >
                  {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />}
                  <span>{confirmLabel}</span>
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
