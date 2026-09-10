import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../../context/ToastContext';
import { fetchPrInfo, createPullRequest, gitPush } from '../../services/api';
import { PullRequestInfo, CreatePrResponse } from '../../types';
import { CustomSelect } from '../common/CustomSelect';
import { 
  GitPullRequest, 
  GitBranch, 
  ArrowRight, 
  ExternalLink, 
  X, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  Upload, 
  Key, 
  Copy,
  Check
} from 'lucide-react';

interface CreatePrModalProps {
  isOpen: boolean;
  repoId: string;
  repoName: string;
  onClose: () => void;
  onOpenPublishModal?: () => void;
}

export const CreatePrModal: React.FC<CreatePrModalProps> = ({
  isOpen,
  repoId,
  repoName,
  onClose,
  onOpenPublishModal,
}) => {
  const { showToast } = useToast();
  const [prInfo, setPrInfo] = useState<PullRequestInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [headBranch, setHeadBranch] = useState('');
  const [baseBranch, setBaseBranch] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [token, setToken] = useState(() => localStorage.getItem('gtv_github_token') || '');
  const [rememberToken, setRememberToken] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdPr, setCreatedPr] = useState<CreatePrResponse['pr'] | null>(null);
  const [compareUrl, setCompareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadPrData = async () => {
    setIsLoading(true);
    setError(null);
    setCreatedPr(null);
    setCompareUrl(null);
    try {
      const data = await fetchPrInfo(repoId);
      setPrInfo(data);
      setHeadBranch(data.currentBranch);
      setBaseBranch(data.defaultBaseBranch);

      // Default Title
      const defaultTitle = data.latestCommitSubject 
        ? data.latestCommitSubject 
        : `合并分支 ${data.currentBranch} 到 ${data.defaultBaseBranch}`;
      setTitle(defaultTitle);

      // Default Body template
      const commitList = data.recentCommits.length > 0
        ? data.recentCommits.map(c => `- ${c}`).join('\n')
        : '- 代码提交与优化';
      setBody(`### 变更概述\n\n${commitList}\n\n### 关联问题\n\n无`);
    } catch (err: any) {
      setError(err.message || '加载 PR 配置信息失败');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadPrData();
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

  const handlePushHead = async () => {
    setIsPushing(true);
    setError(null);
    try {
      await gitPush(repoId);
      showToast(`已成功将分支 ${headBranch} 推送到远程`, 'success');
      await loadPrData();
    } catch (err: any) {
      setError(err.message || '推送分支失败，请检查网络或权限');
    } finally {
      setIsPushing(false);
    }
  };

  const generateCompareUrl = () => {
    if (!prInfo?.githubRepo) return '';
    return `https://github.com/${prInfo.githubRepo}/compare/${encodeURIComponent(baseBranch)}...${encodeURIComponent(headBranch)}?expand=1&title=${encodeURIComponent(title.trim())}&body=${encodeURIComponent(body.trim())}`;
  };

  const handleOpenInBrowser = () => {
    if (!title.trim()) {
      setError('请输入 PR 标题');
      return;
    }
    if (headBranch === baseBranch) {
      setError('源分支与目标分支不能相同');
      return;
    }
    const url = generateCompareUrl();
    if (url) {
      window.open(url, '_blank');
      showToast('已在浏览器中打开 GitHub 对比与 PR 创建页面', 'info');
      onClose();
    }
  };

  const handleSubmitApi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('请输入 PR 标题');
      return;
    }
    if (headBranch === baseBranch) {
      setError('源分支与目标分支不能相同');
      return;
    }

    if (!token.trim()) {
      handleOpenInBrowser();
      return;
    }

    setIsSubmitting(true);
    setError(null);

    if (rememberToken) {
      localStorage.setItem('gtv_github_token', token.trim());
    } else {
      localStorage.removeItem('gtv_github_token');
    }

    try {
      const res = await createPullRequest(repoId, {
        title: title.trim(),
        body: body.trim(),
        head: headBranch,
        base: baseBranch,
        token: token.trim()
      });

      if (res.pr) {
        setCreatedPr(res.pr);
        setCompareUrl(res.compareUrl);
        showToast(`PR #${res.pr.number} 创建成功`, 'success');
      } else {
        window.open(res.compareUrl, '_blank');
        onClose();
      }
    } catch (err: any) {
      setError(err.message || '创建 PR 失败，请检查分支状态或 Token 权限');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = () => {
    const link = createdPr?.html_url || compareUrl;
    if (link) {
      navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      showToast('PR 链接已复制到剪贴板', 'success');
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
            className="w-full max-w-xl bg-white dark:bg-[#161b22] rounded-3xl shadow-2xl border border-slate-200/80 dark:border-[#30363d] overflow-hidden flex flex-col max-h-[85vh]"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-[#30363d] shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs">
                  <GitPullRequest className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <span>提交 Pull Request (PR)</span>
                    {prInfo?.githubRepo && (
                      <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-slate-100 dark:bg-[#21262d] text-slate-600 dark:text-slate-400 font-mono">
                        {prInfo.githubRepo}
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] text-slate-400 dark:text-[#8b949e]">
                    向目标主干或远程分支发起代码合并请求
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-[#21262d] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {isLoading ? (
                <div className="py-16 flex flex-col items-center justify-center gap-2.5 text-slate-400 text-xs">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                  <span>正在检测分支与 GitHub 仓库状态...</span>
                </div>
              ) : !prInfo?.hasGitHubRemote ? (
                <div className="p-6 text-center space-y-3 bg-amber-50/70 dark:bg-amber-950/30 rounded-2xl border border-amber-200/80 dark:border-amber-900/40">
                  <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      尚未关联 GitHub 远程仓库
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      创建 Pull Request 需要当前本地仓库已关联 GitHub 远程代码库。
                    </p>
                  </div>
                  {onOpenPublishModal && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenPublishModal();
                      }}
                      className="px-4 py-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors"
                    >
                      立即配置 GitHub 远程仓库
                    </button>
                  )}
                </div>
              ) : createdPr ? (
                /* Success State */
                <div className="py-8 text-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-xs">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                      Pull Request 创建成功
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-[#8b949e] mt-1">
                      #{createdPr.number} {createdPr.title}
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <a
                      href={createdPr.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors inline-flex items-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>在 GitHub 中查看 PR</span>
                    </a>
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="px-3.5 py-2 rounded-full bg-slate-100 dark:bg-[#21262d] hover:bg-slate-200 dark:hover:bg-[#30363d] text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors inline-flex items-center gap-1.5"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? '已复制' : '复制链接'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Form */
                <form onSubmit={handleSubmitApi} className="space-y-4">
                  {/* Branch Comparison Selector */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0d1117] border border-slate-200/80 dark:border-[#30363d] space-y-2">
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      分支比对方向 (Head → Base)
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Head Branch */}
                      <div className="flex-1 min-w-0">
                        <label className="block text-[10px] text-slate-500 dark:text-[#8b949e] mb-1 font-medium">
                          源分支 (Head / 你的修改)
                        </label>
                        <CustomSelect
                          value={headBranch}
                          onChange={setHeadBranch}
                          options={prInfo.branches.map(b => ({
                            value: b,
                            label: b,
                            isCurrent: b === prInfo.currentBranch
                          }))}
                        />
                      </div>

                      <ArrowRight className="w-4 h-4 text-slate-400 shrink-0 mt-5" />

                      {/* Base Branch */}
                      <div className="flex-1 min-w-0">
                        <label className="block text-[10px] text-slate-500 dark:text-[#8b949e] mb-1 font-medium">
                          目标分支 (Base / 合并目标)
                        </label>
                        <CustomSelect
                          value={baseBranch}
                          onChange={setBaseBranch}
                          options={prInfo.branches.map(b => ({
                            value: b,
                            label: b,
                            isCurrent: b === prInfo.currentBranch
                          }))}
                        />
                      </div>
                    </div>

                    {headBranch === baseBranch && (
                      <div className="text-[11px] text-rose-500 flex items-center gap-1 pt-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>源分支与目标分支相同，请选择不同的目标分支发起合并。</span>
                      </div>
                    )}
                  </div>

                  {/* Unpushed Commits Warning */}
                  {prInfo.ahead > 0 && (
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/40 text-xs">
                      <div className="flex items-center gap-2">
                        <Upload className="w-4 h-4 text-indigo-500 shrink-0" />
                        <span className="text-indigo-900 dark:text-indigo-200">
                          本地有 <strong>{prInfo.ahead}</strong> 个提交尚未推送到远程
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handlePushHead}
                        disabled={isPushing}
                        className="px-3 py-1 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold transition-colors shrink-0 flex items-center gap-1"
                      >
                        {isPushing ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                        <span>{isPushing ? '推送中...' : '立即推送'}</span>
                      </button>
                    </div>
                  )}

                  {/* PR Title */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      PR 标题 <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      placeholder="简明扼要概括本次合并的变更..."
                      className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-100/90 dark:bg-[#0d1117] border border-slate-200 dark:border-[#30363d] focus:border-indigo-500 focus:bg-white dark:focus:bg-[#0d1117] focus:outline-none dark:text-slate-200 transition-colors"
                      required
                    />
                  </div>

                  {/* PR Body */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      PR 说明 / 描述 (Markdown)
                    </label>
                    <textarea
                      value={body}
                      onChange={e => setBody(e.target.value)}
                      rows={5}
                      placeholder="详细描述你的修改内容、目的与关联 Issue..."
                      className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-100/90 dark:bg-[#0d1117] border border-slate-200 dark:border-[#30363d] focus:border-indigo-500 focus:bg-white dark:focus:bg-[#0d1117] focus:outline-none dark:text-slate-200 transition-colors font-mono resize-none leading-relaxed"
                    />
                  </div>

                  {/* Optional GitHub Token */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0d1117] border border-slate-200/80 dark:border-[#30363d] space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5 text-amber-500" />
                        <span>GitHub Token (可选，直接在应用内建 PR)</span>
                      </span>
                      <label className="flex items-center gap-1 text-[11px] text-slate-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={rememberToken}
                          onChange={e => setRememberToken(e.target.checked)}
                          className="rounded text-indigo-600 focus:ring-0"
                        />
                        <span>记住 Token</span>
                      </label>
                    </div>
                    <input
                      type="password"
                      value={token}
                      onChange={e => setToken(e.target.value)}
                      placeholder="ghp_... (个人访问令牌，不填则通过网页创建)"
                      className="w-full px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-[#161b22] border border-slate-200 dark:border-[#30363d] focus:border-indigo-500 focus:outline-none dark:text-slate-200 font-mono"
                    />
                  </div>

                  {error && (
                    <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span className="break-words leading-relaxed">{error}</span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleOpenInBrowser}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-slate-200 dark:border-[#30363d] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#21262d] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
                      title="打开 GitHub 预填充页面"
                    >
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      <span>在 GitHub 网页中对比创建</span>
                    </button>

                    <div className="flex items-center gap-2 shrink-0 ml-auto">
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-full text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-[#21262d] transition-colors cursor-pointer whitespace-nowrap shrink-0"
                      >
                        取消
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting || headBranch === baseBranch}
                        className="px-5 py-2 rounded-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                      >
                        {isSubmitting ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                        ) : (
                          <GitPullRequest className="w-3.5 h-3.5 shrink-0" />
                        )}
                        <span>{isSubmitting ? '提交中...' : (token.trim() ? '直接提交 PR' : '前往创建 PR')}</span>
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
