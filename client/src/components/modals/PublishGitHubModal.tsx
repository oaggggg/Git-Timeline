import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../../context/ToastContext';
import { fetchRemotes, publishToGitHub, gitPush } from '../../services/api';
import { GitRemoteItem } from '../../types';
import { 
  Globe, 
  ExternalLink, 
  ArrowUpRight, 
  X, 
  Loader2, 
  CheckCircle2, 
  Link2,
  Share2
} from 'lucide-react';

interface PublishGitHubModalProps {
  isOpen: boolean;
  repoId: string;
  repoName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const PublishGitHubModal: React.FC<PublishGitHubModalProps> = ({
  isOpen,
  repoId,
  repoName,
  onClose,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const [remotes, setRemotes] = useState<GitRemoteItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [remoteUrl, setRemoteUrl] = useState('');
  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRemotes = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchRemotes(repoId);
      setRemotes(res.remotes);
      const origin = res.remotes.find(r => r.name === 'origin') || res.remotes[0];
      if (origin) {
        setRemoteUrl(origin.pushUrl || origin.fetchUrl);
      } else {
        setRemoteUrl('');
      }
    } catch (err: any) {
      setError(err.message || '获取远程仓库配置失败');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadRemotes();
      setIsEditingUrl(false);
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

  const originRemote = remotes.find(r => r.name === 'origin') || remotes[0];
  const hasExistingRemote = Boolean(originRemote && originRemote.pushUrl);

  const handlePublish = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanUrl = remoteUrl.trim();
    if (!cleanUrl) {
      setError('请输入 GitHub 仓库远程地址');
      return;
    }

    setIsPublishing(true);
    setError(null);

    try {
      const res = await publishToGitHub(repoId, cleanUrl);
      showToast(`已成功发布并推送到 GitHub (${res.currentBranch})`, 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || '发布到 GitHub 失败，请检查远程仓库权限或网络连接');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleSyncPush = async () => {
    setIsPublishing(true);
    setError(null);

    try {
      await gitPush(repoId, true);
      showToast('已成功推送最新提交到 GitHub', 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || '推送失败，请检查网络或冲突');
    } finally {
      setIsPublishing(false);
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
            className="w-full max-w-md bg-white dark:bg-[#161b22] rounded-3xl shadow-2xl border border-slate-200/80 dark:border-[#30363d] overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-[#30363d]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 flex items-center justify-center shadow-xs">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    发布到 GitHub
                  </h3>
                  <p className="text-[11px] text-slate-400 dark:text-[#8b949e]">
                    同步本地仓库至 GitHub 远程代码库
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-[#21262d] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {isLoading ? (
                <div className="py-8 flex flex-col items-center justify-center text-slate-400 text-xs gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                  <span>正在检测远程仓库信息...</span>
                </div>
              ) : hasExistingRemote && !isEditingUrl ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/60 flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <div className="space-y-1 min-w-0">
                      <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                        当前仓库已关联 GitHub 远程源
                      </div>
                      <div className="text-[11px] font-mono text-slate-600 dark:text-slate-300 break-all">
                        {originRemote?.pushUrl || originRemote?.fetchUrl}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    {originRemote?.githubRepo && (
                      <a
                        href={`https://github.com/${originRemote.githubRepo}`}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full py-2.5 px-4 rounded-2xl border border-slate-200 dark:border-[#30363d] hover:bg-slate-50 dark:hover:bg-[#21262d] text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-2 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                        <span>在 GitHub 网页中打开此项目</span>
                      </a>
                    )}

                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      onClick={handleSyncPush}
                      disabled={isPublishing}
                      className="w-full py-2.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition-all"
                    >
                      {isPublishing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4" />
                      )}
                      <span>推送本地所有提交至 GitHub</span>
                    </motion.button>

                    <button
                      type="button"
                      onClick={() => setIsEditingUrl(true)}
                      className="text-[11px] text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 text-center pt-1"
                    >
                      修改远程仓库 URL 地址
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handlePublish} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      GitHub 仓库远程地址 (Git Remote URL)
                    </label>
                    <div className="relative flex items-center">
                      <Link2 className="w-4 h-4 absolute left-3.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="https://github.com/用户名/仓库名.git"
                        value={remoteUrl}
                        onChange={e => {
                          setRemoteUrl(e.target.value);
                          if (error) setError(null);
                        }}
                        className="w-full pl-10 pr-4 py-2 text-xs rounded-2xl bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-[#30363d] focus:border-indigo-500 focus:bg-white dark:focus:bg-[#0d1117] focus:outline-none dark:text-slate-200 placeholder-slate-400 font-mono transition-all"
                      />
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#0d1117] border border-slate-200/60 dark:border-[#30363d] text-[11px] text-slate-500 dark:text-[#8b949e] leading-relaxed flex items-center justify-between">
                    <span>尚未在 GitHub 创建新仓库？</span>
                    <a
                      href="https://github.com/new"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      <span>前往新建空仓库</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  {/* Error Banner */}
                  {error && (
                    <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs border border-rose-200 dark:border-rose-900/50">
                      {error}
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2">
                    {hasExistingRemote && (
                      <button
                        type="button"
                        onClick={() => setIsEditingUrl(false)}
                        className="flex-1 py-2 rounded-full border border-slate-200 dark:border-[#30363d] text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#21262d] transition-colors"
                      >
                        返回
                      </button>
                    )}
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
                      disabled={isPublishing || !remoteUrl.trim()}
                      className="flex-1 py-2 rounded-full bg-slate-900 hover:bg-black text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-xs font-semibold shadow-xs disabled:opacity-40 transition-all flex items-center justify-center gap-1.5"
                    >
                      {isPublishing ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Share2 className="w-3.5 h-3.5" />
                      )}
                      <span>发布推送</span>
                    </motion.button>
                  </div>
                </form>
              )}

              {/* Error Banner for existing remotes */}
              {error && hasExistingRemote && !isEditingUrl && (
                <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs border border-rose-200 dark:border-rose-900/50">
                  {error}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
