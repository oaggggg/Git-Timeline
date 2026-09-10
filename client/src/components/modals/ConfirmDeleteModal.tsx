import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2 } from 'lucide-react';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  repoName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  repoName,
  onConfirm,
  onCancel,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs"
          onClick={onCancel}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-xs bg-white dark:bg-[#161b22] rounded-3xl shadow-2xl border border-slate-200/80 dark:border-[#30363d] overflow-hidden p-5"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-3 shadow-xs">
                <Trash2 className="w-5 h-5" />
              </div>

              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                移除仓库
              </h3>

              <p className="text-xs text-slate-500 dark:text-[#8b949e] mt-1.5 leading-relaxed">
                确定从列表中移除仓库 <span className="font-semibold text-slate-800 dark:text-slate-200 break-all">{repoName}</span> 吗？
              </p>

              <div className="mt-2.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-[#21262d] text-[11px] text-slate-400 dark:text-[#8b949e]">
                仅移除快捷记录，不删除本地文件
              </div>

              <div className="flex items-center gap-2 w-full mt-5">
                <button
                  type="button"
                  onClick={onCancel}
                  className="flex-1 py-2 rounded-full border border-slate-200 dark:border-[#30363d] text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#21262d] transition-colors"
                >
                  取消
                </button>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  type="button"
                  onClick={onConfirm}
                  className="flex-1 py-2 rounded-full bg-rose-600 hover:bg-rose-700 text-xs font-semibold text-white shadow-xs transition-colors"
                >
                  确定移除
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
