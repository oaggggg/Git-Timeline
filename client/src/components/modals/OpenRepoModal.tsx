import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRepo } from '../../context/RepoContext';
import { useToast } from '../../context/ToastContext';
import { browseDirectories, DirectoryBrowseResult } from '../../services/api';
import { 
  FolderOpen, 
  FolderGit2, 
  Folder, 
  X, 
  Loader2, 
  ArrowRight,
  ChevronUp,
  HardDrive,
  GitBranch,
  RefreshCw,
  ExternalLink
} from 'lucide-react';

interface OpenRepoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OpenRepoModal: React.FC<OpenRepoModalProps> = ({ isOpen, onClose }) => {
  const { addNewRepo, openRepoDialog, activeRepo } = useRepo();
  const { showToast } = useToast();
  const [repoPath, setRepoPath] = useState('');
  const [browseData, setBrowseData] = useState<DirectoryBrowseResult | null>(null);
  const [isLoadingDir, setIsLoadingDir] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPickingNative, setIsPickingNative] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load directory list
  const loadDirectory = async (targetPath?: string) => {
    setIsLoadingDir(true);
    setError(null);
    try {
      const data = await browseDirectories(targetPath);
      setBrowseData(data);
      setRepoPath(data.currentPath);
    } catch (err: any) {
      setError(err.message || '加载目录失败');
    } finally {
      setIsLoadingDir(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setIsSubmitting(false);
      setIsPickingNative(false);
      const initial = activeRepo ? activeRepo.path : undefined;
      loadDirectory(initial);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, [isOpen]);

  const handleOpenDirectory = async (pathString: string) => {
    const clean = pathString.trim();
    if (!clean) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const repo = await addNewRepo(clean);
      showToast(`已成功打开仓库: ${repo.name}`, 'success');
      onClose();
    } catch (err: any) {
      setError(err.message || '路径不是有效的 Git 仓库（缺少 .git 目录）');
      showToast(err.message || '路径不是有效的 Git 仓库', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

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
      setError('系统选择器未能响应，请在下方目录列表中直接点选或输入路径');
    } finally {
      setIsPickingNative(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-2xl bg-white dark:bg-[#161b22] rounded-3xl shadow-2xl border border-slate-200/80 dark:border-[#30363d] overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 dark:border-[#30363d] shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs">
                  <FolderOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    打开本地 Git 仓库
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-[#8b949e]">
                    可在下方文件树中直接点选，或粘贴仓库绝对路径
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
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Drive & Navigation Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                {/* Drives */}
                <div className="flex items-center gap-1.5 overflow-x-auto">
                  <span className="text-[11px] font-semibold text-slate-400 shrink-0">磁盘:</span>
                  {browseData?.drives.map(drive => {
                    const isSelected = browseData.currentPath.toLowerCase().startsWith(drive.toLowerCase());
                    return (
                      <button
                        key={drive}
                        type="button"
                        onClick={() => loadDirectory(drive)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-[#21262d] hover:bg-slate-200 dark:hover:bg-[#30363d] text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <HardDrive className="w-3 h-3" />
                        <span>{drive}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Parent directory & Refresh buttons */}
                <div className="flex items-center gap-1.5 ml-auto">
                  {browseData?.parentPath && (
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      type="button"
                      onClick={() => loadDirectory(browseData.parentPath!)}
                      className="flex items-center gap-1 px-3 py-1 rounded-full border border-slate-200 dark:border-[#30363d] hover:bg-slate-100 dark:hover:bg-[#21262d] text-slate-600 dark:text-slate-300 transition-colors text-[11px] font-medium shadow-xs"
                      title="返回上一级目录"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                      <span>上一级</span>
                    </motion.button>
                  )}
                  <button
                    type="button"
                    onClick={() => loadDirectory(browseData?.currentPath)}
                    className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-[#21262d] text-slate-400 hover:text-slate-600 transition-colors"
                    title="刷新目录"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDir ? 'animate-spin text-indigo-500' : ''}`} />
                  </button>
                  <button
                    type="button"
                    onClick={handlePickNative}
                    disabled={isPickingNative}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors"
                    title="调用系统文件对话框"
                  >
                    {isPickingNative ? <Loader2 className="w-3 h-3 animate-spin" /> : <ExternalLink className="w-3 h-3" />}
                    <span>系统窗口</span>
                  </button>
                </div>
              </div>

              {/* Current Breadcrumb Path View */}
              <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-slate-50 dark:bg-[#0d1117] border border-slate-200/80 dark:border-[#30363d] font-mono text-xs text-slate-600 dark:text-slate-300 break-all select-all">
                <FolderOpen className="w-4 h-4 text-indigo-500 shrink-0" />
                <span className="flex-1 truncate">{browseData?.currentPath || '加载中...'}</span>
                {browseData?.currentIsGit && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 shrink-0">
                    <GitBranch className="w-2.5 h-2.5" />
                    当前为 Git 仓库
                  </span>
                )}
              </div>

              {/* Directory Browser List */}
              <div className="border border-slate-200/80 dark:border-[#30363d] rounded-2xl bg-white dark:bg-[#0d1117] overflow-hidden shadow-2xs">
                <div className="px-3 py-2 bg-slate-50 dark:bg-[#161b22] border-b border-slate-200/80 dark:border-[#30363d] flex items-center justify-between text-[11px] text-slate-400 font-medium">
                  <span>子文件夹列表</span>
                  <span>{browseData?.directories.length ?? 0} 个项目</span>
                </div>

                <div className="max-h-56 overflow-y-auto p-1.5 space-y-1">
                  {isLoadingDir ? (
                    <div className="flex items-center justify-center py-10 text-xs text-slate-400 gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                      <span>正在加载目录内容...</span>
                    </div>
                  ) : browseData?.directories.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      当前目录下未包含任何子文件夹
                    </div>
                  ) : (
                    browseData?.directories.map(item => (
                      <div
                        key={item.path}
                        className={`group flex items-center justify-between p-2 rounded-xl transition-all select-none cursor-pointer ${
                          item.isGit
                            ? 'bg-indigo-50/40 dark:bg-indigo-950/20 hover:bg-indigo-50 dark:hover:bg-indigo-950/50'
                            : 'hover:bg-slate-100/80 dark:hover:bg-[#21262d]/70'
                        }`}
                        onClick={() => {
                          if (item.isGit) {
                            handleOpenDirectory(item.path);
                          } else {
                            loadDirectory(item.path);
                          }
                        }}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className={`p-1.5 rounded-lg shrink-0 ${
                            item.isGit 
                              ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400' 
                              : 'bg-slate-100 dark:bg-[#21262d] text-slate-400'
                          }`}>
                            {item.isGit ? <FolderGit2 className="w-4 h-4" /> : <Folder className="w-4 h-4" />}
                          </div>
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
                            {item.name}
                          </span>
                          {item.isGit && (
                            <span className="flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 shrink-0">
                              <GitBranch className="w-2.5 h-2.5" />
                              Git 仓库
                            </span>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1.5 shrink-0 opacity-80 group-hover:opacity-100">
                          {item.isGit ? (
                            <motion.button
                              whileTap={{ scale: 0.95 }}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDirectory(item.path);
                              }}
                              className="px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-colors flex items-center gap-1"
                            >
                              <span>立即打开</span>
                              <ArrowRight className="w-3 h-3" />
                            </motion.button>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                loadDirectory(item.path);
                              }}
                              className="px-2.5 py-1 rounded-full text-[11px] text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-[#21262d] transition-colors"
                            >
                              进入
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Direct Path Input Bar */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleOpenDirectory(repoPath);
                }}
                className="space-y-2 pt-1"
              >
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                  直接输入或粘贴仓库绝对路径
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
                    disabled={isSubmitting}
                    className="w-full pl-10 pr-24 py-2.5 text-xs rounded-full bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-[#30363d] focus:border-indigo-500 focus:bg-white dark:focus:bg-[#0d1117] focus:outline-none dark:text-slate-200 placeholder-slate-400 transition-all font-mono"
                  />
                  <motion.button
                    type="submit"
                    whileTap={{ scale: 0.94 }}
                    disabled={!repoPath.trim() || isSubmitting}
                    className="absolute right-1.5 px-4 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <span>打开</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </motion.button>
                </div>

                {/* Error Banner */}
                {error && (
                  <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs border border-rose-200 dark:border-rose-900/50">
                    {error}
                  </div>
                )}
              </form>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-slate-50/70 dark:bg-[#161b22] border-t border-slate-100 dark:border-[#30363d] flex items-center justify-between shrink-0">
              <span className="text-[11px] text-slate-400">
                支持本地任意磁盘目录，自动识别 .git 版本库
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-1.5 rounded-full border border-slate-200 dark:border-[#30363d] hover:bg-slate-100 dark:hover:bg-[#21262d] text-xs font-semibold text-slate-600 dark:text-slate-300 transition-colors"
                >
                  关闭
                </button>
                {browseData?.currentIsGit && (
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    type="button"
                    onClick={() => handleOpenDirectory(browseData.currentPath)}
                    disabled={isSubmitting}
                    className="px-4 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1 transition-all"
                  >
                    {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FolderGit2 className="w-3.5 h-3.5" />}
                    <span>打开当前文件夹</span>
                  </motion.button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
