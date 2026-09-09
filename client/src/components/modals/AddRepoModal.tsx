import React, { useState } from 'react';
import { useRepo } from '../../context/RepoContext';
import { X, FolderPlus, Loader2, AlertCircle } from 'lucide-react';

interface AddRepoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddRepoModal: React.FC<AddRepoModalProps> = ({ isOpen, onClose }) => {
  const { addNewRepo } = useRepo();
  const [repoPath, setRepoPath] = useState('');
  const [repoName, setRepoName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoPath.trim()) return;

    setLoading(true);
    setError(null);
    try {
      await addNewRepo(repoPath.trim(), repoName.trim() || undefined);
      setRepoPath('');
      setRepoName('');
      onClose();
    } catch (err: any) {
      setError(err.message || '添加仓库失败，请检查路径是否包含 .git 目录');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-xl bg-white dark:bg-[#161b22] border border-slate-200 dark:border-[#30363d] shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-slate-800 dark:text-[#e6edf3]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-[#30363d]">
          <div className="flex items-center gap-2 font-semibold text-sm">
            <FolderPlus className="w-4 h-4 text-indigo-500" />
            <span>添加本地 Git 仓库</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          {error && (
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              本地项目绝对路径 <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="例如: D:\my-projects\repo 或 /home/user/repo"
              value={repoPath}
              onChange={e => setRepoPath(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-[#30363d] focus:border-indigo-500 focus:outline-none dark:text-slate-200 font-mono"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              请确保目标目录下存在 .git 文件夹。
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              自定义别名 (选填)
            </label>
            <input
              type="text"
              placeholder="留空则自动使用文件夹名"
              value={repoName}
              onChange={e => setRepoName(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-[#30363d] focus:border-indigo-500 focus:outline-none dark:text-slate-200"
            />
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-[#30363d]">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-[#30363d] hover:bg-slate-100 dark:hover:bg-[#21262d]"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading || !repoPath.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-medium disabled:opacity-50 transition-colors shadow-sm"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              确认添加
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
