import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRepo } from '../../context/RepoContext';
import { useToast } from '../../context/ToastContext';
import { 
  FolderOpen, 
  FolderGit2, 
  X, 
  Loader2, 
  ArrowRight,
  FolderTree
} from 'lucide-react';

interface OpenRepoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OpenRepoModal: React.FC<OpenRepoModalProps> = ({ isOpen, onClose }) => {
  const { addNewRepo, openRepoDialog, activeRepo } = useRepo();
  const { showToast } = useToast();
  const [repoPath, setRepoPath] = useState('');
  const [isPickingNative, setIsPickingNative] = useState(false);
  const [isSubmittingPath, setIsSubmittingPath] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setRepoPath('');
      setError(null);
      setIsPickingNative(false);
      setIsSubmittingPath(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handlePickNative = async () => {
    if (isPickingNative) return;
    setError(null);
    setIsPickingNative(true);
    try {
      const repo = await openRepoDialog();
      if (repo) {
        showToast(`已成功打开仓库: ${repo.name}`, 'success');
        onClose();
      }
    } catch (err: any) {
      setError(err.message || '打开系统文件夹选择器失败');
      showToast(err.message || '打开系统文件夹选择器失败', 'error');
    } finally {
      setIsPickingNative(false);
    }
  };

  const handleSubmitPath = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanPath = repoPath.trim();
    if (!cleanPath) {
      setError('请输入本地 Git 仓库路径');
      return;
    }

    setError(null);
    setIsSubmittingPath(true);
    try {
      const repo = await addNewRepo(cleanPath);
      showToast(`已成功打开仓库: ${repo.name}`, 'success');
      onClose();
    } catch (err: any) {
      setError(err.message || '路径无效或缺少 .git 目录');
      showToast(err.message || '路径无效或缺少 .git 目录', 'error');
    } finally {
      setIsSubmittingPath(false);
    }
  };

  const parentDir = activeRepo ? activeRepo.path.replace(/[\\/][^\\/]+$/, '') : null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-lg bg-white dark:bg-[#161b22] rounded-3xl shadow-xl border border-slate-200/80 dark:border-[#30363d] overflow-hidden"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-[#30363d]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs">
                  <FolderOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    打开本地 Git 仓库
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-[#8b949e]">
                    选择系统文件夹或直接输入项目绝对路径
                  </p>
                </div>
              </div>
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-[#21262d] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </motion.button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* Option 1: Native System Folder Chooser */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
                  方法一：直接调用系统选择器
                </label>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handlePickNative}
                  disabled={isPickingNative || isSubmittingPath}
                  className="w-full p-4 rounded-2xl border-2 border-dashed border-indigo-200 hover:border-indigo-500 dark:border-indigo-900/50 dark:hover:border-indigo-500 bg-indigo-50/40 hover:bg-indigo-50/70 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/40 flex items-center justify-center gap-3.5 transition-all text-left group"
                >
                  <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                    {isPickingNative ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <FolderOpen className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <span>{isPickingNative ? '等待系统窗口选择中...' : '点击唤起系统文件夹选择器'}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-[#8b949e] mt-0.5 truncate">
                      在弹出的系统对话框中浏览并选中本地仓库目录
                    </div>
                  </div>
                </motion.button>
              </div>

              {/* Divider */}
              <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200/80 dark:border-[#30363d]" />
                </div>
                <span className="relative px-3 bg-white dark:bg-[#161b22] text-[11px] text-slate-400 font-medium">
                  或者直接输入路径
                </span>
              </div>

              {/* Option 2: Path Input */}
              <form onSubmit={handleSubmitPath} className="space-y-2.5">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                  方法二：输入或粘贴本地绝对路径
                </label>
                <div className="relative flex items-center">
                  <FolderGit2 className="w-4 h-4 absolute left-3.5 text-slate-400" />
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="例如: D:\fanzhongli\my-project"
                    value={repoPath}
                    onChange={e => {
                      setRepoPath(e.target.value);
                      if (error) setError(null);
                    }}
                    disabled={isSubmittingPath || isPickingNative}
                    className="w-full pl-10 pr-24 py-2.5 text-xs rounded-full bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-[#30363d] focus:border-indigo-500 focus:bg-white dark:focus:bg-[#0d1117] focus:outline-none dark:text-slate-200 placeholder-slate-400 transition-all"
                  />
                  <motion.button
                    type="submit"
                    whileTap={{ scale: 0.94 }}
                    disabled={!repoPath.trim() || isSubmittingPath}
                    className="absolute right-1.5 px-3.5 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors"
                  >
                    {isSubmittingPath ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <span>打开</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </motion.button>
                </div>

                {/* Parent Directory Suggestion Chip */}
                {parentDir && (
                  <div className="flex items-center gap-1.5 pt-1 text-[11px] text-slate-400">
                    <span>建议：</span>
                    <button
                      type="button"
                      onClick={() => setRepoPath(parentDir)}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-[#21262d] dark:hover:bg-[#30363d] text-indigo-600 dark:text-indigo-400 transition-colors font-mono"
                    >
                      <FolderTree className="w-3 h-3" />
                      <span>{parentDir}</span>
                    </button>
                  </div>
                )}

                {/* Error Banner */}
                {error && (
                  <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs border border-rose-200 dark:border-rose-900/50">
                    {error}
                  </div>
                )}
              </form>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50/70 dark:bg-[#161b22] border-t border-slate-100 dark:border-[#30363d] flex justify-end gap-2.5">
              <motion.button
                whileTap={{ scale: 0.96 }}
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-full border border-slate-200 dark:border-[#30363d] hover:bg-slate-100 dark:hover:bg-[#21262d] text-xs font-semibold text-slate-600 dark:text-slate-300 transition-colors"
              >
                取消
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
