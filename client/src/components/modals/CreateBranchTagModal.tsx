import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../../context/ToastContext';
import { createBranch, createTag } from '../../services/api';
import { GitBranch, Tag, X, Loader2 } from 'lucide-react';

interface CreateBranchTagModalProps {
  isOpen: boolean;
  mode: 'branch' | 'tag';
  repoId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateBranchTagModal: React.FC<CreateBranchTagModalProps> = ({
  isOpen,
  mode,
  repoId,
  onClose,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [checkout, setCheckout] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setMessage('');
      setCheckout(true);
      setError(null);
    }
  }, [isOpen, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      setError(mode === 'branch' ? '请输入新分支名称' : '请输入版本标签名称 (如 v1.0.0)');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (mode === 'branch') {
        await createBranch(repoId, cleanName, checkout);
        showToast(`已成功创建分支: ${cleanName}`, 'success');
      } else {
        await createTag(repoId, cleanName, message.trim() || undefined);
        showToast(`已成功创建版本标签: ${cleanName}`, 'success');
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || '创建失败，请检查名称是否符合规范');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isBranch = mode === 'branch';

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-sm bg-white dark:bg-[#161b22] rounded-3xl shadow-2xl border border-slate-200/80 dark:border-[#30363d] overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-[#30363d]">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shadow-xs ${
                  isBranch 
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400' 
                    : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                }`}>
                  {isBranch ? <GitBranch className="w-4 h-4" /> : <Tag className="w-4 h-4" />}
                </div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  {isBranch ? '新建本地分支' : '创建版本标签 (Tag)'}
                </h3>
              </div>

              <button
                onClick={onClose}
                className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-[#21262d] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isBranch ? '分支名称' : '版本号标签名'}
                </label>
                <input
                  type="text"
                  autoFocus
                  placeholder={isBranch ? '例如: feature/login' : '例如: v1.0.0 或 release-2.0'}
                  value={name}
                  onChange={e => {
                    setName(e.target.value);
                    if (error) setError(null);
                  }}
                  className="w-full px-3.5 py-2 text-xs rounded-2xl bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-[#30363d] focus:border-indigo-500 focus:bg-white dark:focus:bg-[#0d1117] focus:outline-none dark:text-slate-200 placeholder-slate-400 font-mono transition-all"
                />
              </div>

              {!isBranch && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    标签附注文案 (可选)
                  </label>
                  <input
                    type="text"
                    placeholder="例如: 第一个稳定正式版发布"
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-2xl bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-[#30363d] focus:border-indigo-500 focus:bg-white dark:focus:bg-[#0d1117] focus:outline-none dark:text-slate-200 placeholder-slate-400 transition-all"
                  />
                </div>
              )}

              {isBranch && (
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-600 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={checkout}
                    onChange={e => setCheckout(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>创建后立即切换至该分支 (Checkout)</span>
                </label>
              )}

              {/* Error Banner */}
              {error && (
                <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs border border-rose-200 dark:border-rose-900/50">
                  {error}
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2 rounded-full border border-slate-200 dark:border-[#30363d] text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#21262d] transition-colors"
                >
                  取消
                </button>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  type="submit"
                  disabled={isSubmitting || !name.trim()}
                  className={`flex-1 py-2 rounded-full text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 ${
                    isBranch 
                      ? 'bg-indigo-600 hover:bg-indigo-700' 
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {isSubmitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : isBranch ? (
                    <GitBranch className="w-3.5 h-3.5" />
                  ) : (
                    <Tag className="w-3.5 h-3.5" />
                  )}
                  <span>{isBranch ? '确认创建分支' : '打上版本标签'}</span>
                </motion.button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
