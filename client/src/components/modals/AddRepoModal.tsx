import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRepo } from '../../context/RepoContext';
import { useToast } from '../../context/ToastContext';
import { X, FolderPlus, Loader2, AlertCircle } from 'lucide-react';

interface AddRepoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddRepoModal: React.FC<AddRepoModalProps> = ({ isOpen, onClose }) => {
  const { addNewRepo } = useRepo();
  const { showToast } = useToast();
  const [repoPath, setRepoPath] = useState('');
  const [repoName, setRepoName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoPath.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const added = await addNewRepo(repoPath.trim(), repoName.trim() || undefined);
      showToast(`成功添加仓库: ${added.name}`, 'success');
      setRepoPath('');
      setRepoName('');
      onClose();
    } catch (err: any) {
      setError(err.message || '添加仓库失败，请检查路径是否存在 .git 目录');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', duration: 0.25 }}
            className="relative w-full max-w-md rounded-2xl bg-white dark:bg-[#161b22] border border-slate-200 dark:border-[#30363d] shadow-2xl overflow-hidden text-slate-800 dark:text-[#e6edf3] z-10"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-[#30363d]">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <FolderPlus className="w-4 h-4 text-indigo-500" />
                <span>添加本地 Git 仓库</span>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </motion.button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {error && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs border border-rose-200 dark:border-rose-900/60">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  本地项目绝对路径 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="例如: D:\my-projects\repo 或 /home/user/repo"
                  value={repoPath}
                  onChange={e => setRepoPath(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-[#30363d] focus:border-indigo-500 focus:outline-none dark:text-slate-200 font-mono transition-colors"
                />
                <p className="mt-1.5 text-[11px] text-slate-400">
                  请确保目标文件夹中包含有效的 .git 仓库数据。
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  自定义显示名称 (选填)
                </label>
                <input
                  type="text"
                  placeholder="留空则自动提取文件夹名称"
                  value={repoName}
                  onChange={e => setRepoName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-[#30363d] focus:border-indigo-500 focus:outline-none dark:text-slate-200 transition-colors"
                />
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-[#30363d]">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-[#30363d] hover:bg-slate-100 dark:hover:bg-[#21262d] transition-colors"
                >
                  取消
                </button>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  type="submit"
                  disabled={loading || !repoPath.trim()}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-xs rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium disabled:opacity-50 transition-colors shadow-xs"
                >
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  确认添加
                </motion.button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
