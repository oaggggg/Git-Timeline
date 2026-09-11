import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../../context/ToastContext';
import { fetchRepoStatus, commitChanges, stageFiles, fetchWorktreeDiff } from '../../services/api';
import { GitStatusResult, GitFileStatus } from '../../types';
import { 
  GitCommit, 
  ArrowUpRight, 
  Check, 
  X, 
  Loader2, 
  FileCode, 
  FilePlus, 
  FileMinus, 
  FileQuestion,
  RefreshCw
} from 'lucide-react';

interface CommitModalProps {
  isOpen: boolean;
  repoId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const COMMIT_TYPES = [
  { prefix: 'feat: ', label: '新增功能 (feat:)' },
  { prefix: 'fix: ', label: '修复缺陷 (fix:)' },
  { prefix: 'docs: ', label: '文档说明 (docs:)' },
  { prefix: 'style: ', label: '界面美化 (style:)' },
  { prefix: 'refactor: ', label: '整理重构 (refactor:)' },
  { prefix: 'perf: ', label: '运行加速 (perf:)' },
  { prefix: 'chore: ', label: '构建配置 (chore:)' },
];

export const CommitModal: React.FC<CommitModalProps> = ({
  isOpen,
  repoId,
  onClose,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const [status, setStatus] = useState<GitStatusResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [stagingPath, setStagingPath] = useState<string | null>(null);
  const [diff, setDiff] = useState<string | null>(null);
  const [diffStaged, setDiffStaged] = useState(false);
  const [isLoadingDiff, setIsLoadingDiff] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadStatus = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchRepoStatus(repoId);
      setStatus(res);
      // Default: select all changed files
      setSelectedPaths(new Set(res.files.map(f => f.path)));
    } catch (err: any) {
      setError(err.message || '获取工作区变动失败');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadStatus();
      setMessage('');
      setError(null);
    }
  }, [isOpen, repoId]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const toggleSelectAll = () => {
    if (!status) return;
    if (selectedPaths.size === status.files.length) {
      setSelectedPaths(new Set());
    } else {
      setSelectedPaths(new Set(status.files.map(f => f.path)));
    }
  };

  const toggleFile = (path: string) => {
    const next = new Set(selectedPaths);
    if (next.has(path)) {
      next.delete(path);
    } else {
      next.add(path);
    }
    setSelectedPaths(next);
  };

  const handleStageToggle = async (file: GitFileStatus) => {
    setStagingPath(file.path);
    setError(null);
    try {
      await stageFiles(repoId, [file.path], !file.staged);
      const nextStatus = await fetchRepoStatus(repoId);
      setStatus(nextStatus);
    } catch (err: any) {
      setError(err.message || '更新文件暂存状态失败');
    } finally {
      setStagingPath(null);
    }
  };

  const handleLoadDiff = async (staged: boolean) => {
    setIsLoadingDiff(true);
    setDiffStaged(staged);
    try {
      const result = await fetchWorktreeDiff(repoId, staged);
      setDiff(result.diff);
    } catch (err: any) {
      setError(err.message || '加载工作区 Diff 失败');
    } finally {
      setIsLoadingDiff(false);
    }
  };

  const handleApplyPrefix = (prefix: string) => {
    if (message.startsWith(prefix)) return;
    // Replace existing prefix if any
    const existingPrefix = COMMIT_TYPES.find(t => message.startsWith(t.prefix));
    if (existingPrefix) {
      setMessage(prefix + message.slice(existingPrefix.prefix.length));
    } else {
      setMessage(prefix + message);
    }
  };

  const handleCommit = async (push = false) => {
    const cleanMsg = message.trim();
    if (!cleanMsg) {
      setError('请输入提交说明 (Commit Message)');
      return;
    }
    if (selectedPaths.size === 0) {
      setError('请至少勾选一个要提交的文件');
      return;
    }

    setIsCommitting(true);
    setError(null);

    try {
      const res = await commitChanges(repoId, {
        message: cleanMsg,
        files: Array.from(selectedPaths),
        push
      });

      showToast(
        push 
          ? `已提交并推送到远程 (${res.commitHash})`
          : `提交成功: ${res.commitHash}`,
        'success'
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || '提交失败');
    } finally {
      setIsCommitting(false);
    }
  };

  const getFileIcon = (fileStatus: GitFileStatus['status']) => {
    switch (fileStatus) {
      case 'added':
      case 'untracked':
        return <FilePlus className="w-3.5 h-3.5 text-emerald-500 shrink-0" />;
      case 'deleted':
        return <FileMinus className="w-3.5 h-3.5 text-rose-500 shrink-0" />;
      case 'renamed':
        return <FileQuestion className="w-3.5 h-3.5 text-indigo-500 shrink-0" />;
      default:
        return <FileCode className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
    }
  };

  const getStatusBadge = (fileStatus: GitFileStatus['status']) => {
    switch (fileStatus) {
      case 'added':
        return <span className="px-1.5 py-0.2 text-[10px] font-bold rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">新文件</span>;
      case 'untracked':
        return <span className="px-1.5 py-0.2 text-[10px] font-bold rounded bg-slate-200 dark:bg-[#30363d] text-slate-700 dark:text-slate-300">未跟踪</span>;
      case 'deleted':
        return <span className="px-1.5 py-0.2 text-[10px] font-bold rounded bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">已删除</span>;
      case 'renamed':
        return <span className="px-1.5 py-0.2 text-[10px] font-bold rounded bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">重命名</span>;
      default:
        return <span className="px-1.5 py-0.2 text-[10px] font-bold rounded bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">修改</span>;
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-2xl bg-white dark:bg-[#161b22] rounded-3xl shadow-2xl border border-slate-200/80 dark:border-[#30363d] overflow-hidden flex flex-col max-h-[85vh]"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-[#30363d] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs">
                  <GitCommit className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    保存并提交修改 (Commit)
                  </h3>
                  <div className="text-[11px] text-slate-400 dark:text-[#8b949e]">
                    当前分支：<span className="font-semibold text-indigo-600 dark:text-indigo-400">{status?.branch || 'HEAD'}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={loadStatus}
                  disabled={isLoading}
                  title="刷新变动状态"
                  className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-[#21262d] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-500' : ''}`} />
                </button>
                <button
                  onClick={onClose}
                  className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-[#21262d] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Beginner Helper Tip Banner */}
              <div className="p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-[11px] text-indigo-700 dark:text-indigo-300 flex items-start gap-2 leading-relaxed">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                <div>
                  <span className="font-semibold">新手提示：</span>
                  系统已默认勾选您刚修改的所有文件。填写一句话说明，点击右下方<span className="font-bold">「一键提交并推送」</span>即可同步保存到本地与云端，无需繁琐命令。
                </div>
              </div>

              {/* Changed Files Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    变动文件列表 ({selectedPaths.size}/{status?.files.length || 0})
                  </span>
                  {status && status.files.length > 0 && (
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      {selectedPaths.size === status.files.length ? '取消全选' : '全部选择'}
                    </button>
                  )}
                </div>

                {isLoading ? (
                  <div className="py-8 flex flex-col items-center justify-center text-slate-400 text-xs gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                    <span>正在检查工作区变动...</span>
                  </div>
                ) : status && status.files.length === 0 ? (
                  <div className="py-8 text-center rounded-2xl bg-slate-50 dark:bg-[#0d1117] border border-dashed border-slate-200 dark:border-[#30363d] text-slate-400 text-xs">
                    工作区很干净，暂无未提交的文件变动
                  </div>
                ) : (
                  <div className="max-h-48 overflow-y-auto rounded-2xl border border-slate-200/80 dark:border-[#30363d] divide-y divide-slate-100 dark:divide-[#30363d] bg-slate-50/50 dark:bg-[#0d1117]/50">
                    {status?.files.map(file => {
                      const isSelected = selectedPaths.has(file.path);
                      return (
                        <div
                          key={file.path}
                          onClick={() => toggleFile(file.path)}
                          className={`flex items-center justify-between p-2.5 px-3 cursor-pointer hover:bg-slate-100/80 dark:hover:bg-[#21262d] transition-colors text-xs ${
                            isSelected ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                            {getFileIcon(file.status)}
                            <span className="font-mono text-[11px] truncate text-slate-700 dark:text-slate-300" title={file.path}>
                              {file.path}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={event => {
                                event.stopPropagation();
                                handleStageToggle(file);
                              }}
                              disabled={stagingPath === file.path}
                              className={`px-2 py-1 rounded-lg text-[10px] font-semibold border transition-colors disabled:opacity-60 ${
                                file.staged
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300'
                                  : 'border-slate-200 bg-white text-slate-500 hover:border-indigo-300 dark:border-[#30363d] dark:bg-[#161b22] dark:text-slate-400'
                              }`}
                              title={file.staged ? '取消暂存此文件' : '暂存此文件'}
                            >
                              {stagingPath === file.path ? '处理中...' : file.staged ? '已暂存' : '暂存'}
                            </button>
                            {getStatusBadge(file.status)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Commit Message Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    工作区 Diff
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleLoadDiff(false)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
                        diff !== null && !diffStaged
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-600 dark:bg-[#21262d] dark:text-slate-300'
                      }`}
                    >
                      未暂存
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLoadDiff(true)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
                        diff !== null && diffStaged
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-600 dark:bg-[#21262d] dark:text-slate-300'
                      }`}
                    >
                      已暂存
                    </button>
                  </div>
                </div>
                {diff !== null && (
                  <pre className="max-h-40 overflow-auto rounded-xl bg-[#0d1117] p-3 text-[10px] leading-relaxed text-slate-300 whitespace-pre-wrap font-mono">
                    {isLoadingDiff ? '正在加载 Diff...' : diff || '当前没有代码差异'}
                  </pre>
                )}
              </div>

              {/* Commit Message Section */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  提交说明 (Commit Message)
                </label>

                {/* Conventional commit prefix pills */}
                <div className="flex flex-wrap gap-1.5 pb-0.5">
                  {COMMIT_TYPES.map(item => (
                    <button
                      key={item.prefix}
                      type="button"
                      onClick={() => handleApplyPrefix(item.prefix)}
                      className={`px-2 py-0.5 rounded-full text-[11px] font-medium border transition-all ${
                        message.startsWith(item.prefix)
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-slate-100 dark:bg-[#21262d] text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-[#30363d] hover:border-indigo-300'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={3}
                  value={message}
                  onChange={e => {
                    setMessage(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="请输入清晰扼要的改动说明..."
                  className="w-full px-3.5 py-2.5 text-xs rounded-2xl bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-[#30363d] focus:border-indigo-500 focus:bg-white dark:focus:bg-[#0d1117] focus:outline-none dark:text-slate-200 placeholder-slate-400 transition-all resize-none font-sans"
                />
              </div>

              {/* Error Banner */}
              {error && (
                <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs border border-rose-200 dark:border-rose-900/50">
                  {error}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50/70 dark:bg-[#161b22] border-t border-slate-100 dark:border-[#30363d] flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 shrink-0">
              <span className="text-[11px] text-slate-400 dark:text-[#8b949e] whitespace-nowrap shrink-0 hidden md:inline">
                修改将安全存入历史记录，随时可回退
              </span>
              <div className="flex items-center gap-2.5 shrink-0 ml-auto">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isCommitting}
                  className="px-4 py-2 rounded-full border border-slate-200 dark:border-[#30363d] hover:bg-slate-100 dark:hover:bg-[#21262d] text-xs font-semibold text-slate-600 dark:text-slate-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  取消
                </button>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  type="button"
                  onClick={() => handleCommit(false)}
                  disabled={isCommitting || !status || status.files.length === 0}
                  className="px-4 py-2 rounded-full border border-slate-200 dark:border-[#30363d] bg-white dark:bg-[#161b22] hover:bg-slate-100 dark:hover:bg-[#21262d] text-slate-700 dark:text-slate-300 text-xs font-semibold shadow-2xs disabled:opacity-50 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                  title="仅保存在本地电脑的历史记录中，暂不上载到云端"
                >
                  {isCommitting ? <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" /> : <GitCommit className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                  <span>仅保存在本地</span>
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  type="button"
                  onClick={() => handleCommit(true)}
                  disabled={isCommitting || !status || status.files.length === 0}
                  className="px-5 py-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-500/20 disabled:opacity-50 transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                  title="保存到本地并立即推送到云端远程仓库 (新手推荐)"
                >
                  {isCommitting ? <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" /> : <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />}
                  <span>一键提交并推送 (推荐)</span>
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
