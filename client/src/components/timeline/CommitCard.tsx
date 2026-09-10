import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CommitItem } from '../../types';
import { CommitDiffView } from '../diff/CommitDiffView';
import { RollbackModal } from '../modals/RollbackModal';
import { CreateBranchTagModal } from '../modals/CreateBranchTagModal';
import { useToast } from '../../context/ToastContext';
import { prefetchCommitDiff, gitRevert } from '../../services/api';
import { 
  GitCommit, 
  GitBranch, 
  Tag, 
  Copy, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Files,
  Plus,
  Minus,
  Clock,
  RotateCcw,
  Undo2,
  MoreHorizontal
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { AuthorAvatar } from '../common/AuthorAvatar';

interface CommitCardProps {
  repoId: string;
  commit: CommitItem;
  onRefresh?: () => void;
}

export const CommitCard: React.FC<CommitCardProps> = React.memo(({ repoId, commit, onRefresh }) => {
  const { showToast, dismissToast } = useToast();
  const [copied, setCopied] = useState(false);
  const [isDiffExpanded, setIsDiffExpanded] = useState(false);
  const [isBodyExpanded, setIsBodyExpanded] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [menuPlacement, setMenuPlacement] = useState<'bottom' | 'top'>('bottom');
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [isReverting, setIsReverting] = useState(false);
  const actionMenuRef = useRef<HTMLDivElement>(null);

  const handleToggleActionMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!showActionMenu && actionMenuRef.current) {
      const rect = actionMenuRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAboveInsideContainer = rect.top - 120;
      const MENU_HEIGHT = 240;

      if (spaceBelow < MENU_HEIGHT && spaceAboveInsideContainer >= MENU_HEIGHT) {
        setMenuPlacement('top');
      } else {
        setMenuPlacement('bottom');
      }
    }
    setShowActionMenu(prev => !prev);
  };

  // Close action menu on click outside or Escape
  useEffect(() => {
    if (!showActionMenu) return;

    const handleClickOutside = (e: MouseEvent | PointerEvent) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target as Node)) {
        setShowActionMenu(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowActionMenu(false);
      }
    };

    document.addEventListener('pointerdown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showActionMenu]);

  const handleRevert = async () => {
    setShowActionMenu(false);
    setIsReverting(true);
    const toastId = showToast(`正在撤销提交 ${commit.shortHash}...`, 'loading');
    try {
      await gitRevert(repoId, commit.hash);
      dismissToast(toastId);
      showToast(`已成功撤销提交 ${commit.shortHash} (已生成抵消提交)`, 'success');
      onRefresh?.();
    } catch (err: any) {
      dismissToast(toastId);
      showToast(err.message || '撤销提交失败，可能存在代码冲突', 'error', 6000);
    } finally {
      setIsReverting(false);
    }
  };

  const copyHash = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(commit.hash);
    setCopied(true);
    showToast(`已复制 Commit SHA: ${commit.shortHash}`, 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const commitDate = new Date(commit.authorDate);
  const relativeTime = formatDistanceToNow(commitDate, { addSuffix: true, locale: zhCN });
  const fullDateTime = format(commitDate, 'yyyy年MM月dd日 HH:mm');
  const exactTime = format(commitDate, 'yyyy-MM-dd HH:mm:ss');

  // Parse and prioritize release version tags
  const releaseTags = Array.from(
    new Set([
      ...(commit.tags || []),
      ...commit.refs.filter(r => r.includes('tag:')).map(r => r.replace('tag:', '').trim())
    ])
  ).filter(Boolean);

  // Non-tag refs (branches, HEAD)
  const branchRefs = commit.refs
    .filter(r => !r.includes('tag:'))
    .map(r => r.trim())
    .filter(Boolean);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ 
        duration: 0.2, 
        ease: 'easeOut'
      }}
      style={{ zIndex: showActionMenu ? 60 : 1 }}
      className={`relative pl-8 pb-6 group ${showActionMenu ? 'z-50' : 'z-0'}`}
      onMouseEnter={() => prefetchCommitDiff(repoId, commit.hash)}
    >
      {/* Vertical Timeline Track Line */}
      <div className="absolute left-3.5 top-5 bottom-0 w-0.5 bg-slate-200 dark:bg-[#30363d] group-last:hidden" />

      {/* Modern Glowing Rounded Timeline Node */}
      <div className="absolute left-1.5 top-4 w-4 h-4 rounded-full bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center ring-4 ring-slate-50 dark:ring-[#0d1117] z-10 transition-transform group-hover:scale-125">
        <div className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400 shadow-xs" />
      </div>

      {/* Card Body - Rounded 3XL & Soft Shadow */}
      <div
        className={`rounded-3xl border transition-all duration-200 relative ${
          showActionMenu ? 'z-50' : 'z-0'
        } ${
          isDiffExpanded
            ? 'bg-white dark:bg-[#161b22] border-indigo-500/40 dark:border-indigo-500/50 shadow-md ring-2 ring-indigo-500/10'
            : 'bg-white dark:bg-[#161b22] border-slate-200/80 dark:border-[#30363d] hover:border-indigo-200 dark:hover:border-indigo-900 shadow-xs hover:shadow-md'
        }`}
      >
        <div className="p-5">
          {/* Header Row: Author, Date, Hash & Badges */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
            {/* Author & Specific Date Time */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <AuthorAvatar
                name={commit.authorName}
                email={commit.authorEmail}
                size="md"
                className="ring-2 ring-white dark:ring-[#161b22]"
              />
              <div className="flex items-center gap-2 text-xs flex-wrap">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {commit.authorName}
                </span>
                <span className="text-slate-400 dark:text-[#8b949e]">
                  {relativeTime}
                </span>
                <span
                  className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-[#8b949e] tabular-nums font-medium bg-slate-100/90 dark:bg-[#21262d] px-2.5 py-0.5 rounded-full"
                  title={`精确时间戳: ${exactTime}`}
                >
                  <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                  <span>{fullDateTime}</span>
                </span>
              </div>
            </div>

            {/* Right: Version Release Tags, Branches & Hash */}
            <div className="flex flex-wrap items-center gap-1.5">
              {/* Release Version Tags */}
              {releaseTags.map((tag, idx) => (
                <span
                  key={`tag-${idx}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-xs ring-1 ring-emerald-500/20 select-none"
                  title={`版本标签: ${tag}`}
                >
                  <Tag className="w-3 h-3 text-emerald-500 shrink-0" />
                  <span>{tag}</span>
                </span>
              ))}

              {/* Branch Badges */}
              {branchRefs.map((ref, idx) => (
                <span
                  key={`branch-${idx}`}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800 select-none"
                >
                  <GitBranch className="w-2.5 h-2.5 shrink-0" />
                  <span>{ref}</span>
                </span>
              ))}

              {/* Commit Hash Badge (Pill Shaped) */}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={copyHash}
                title={`点击复制完整 SHA: ${commit.hash}`}
                className="flex items-center gap-1 px-2.5 py-0.5 rounded-full font-mono text-[11px] font-medium bg-slate-100 hover:bg-indigo-50 dark:bg-[#21262d] dark:hover:bg-[#30363d] text-slate-600 hover:text-indigo-600 dark:text-slate-300 transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-500" />
                    <span className="text-emerald-500">已复制</span>
                  </>
                ) : (
                  <>
                    <GitCommit className="w-3 h-3 text-slate-400" />
                    <span>{commit.shortHash}</span>
                    <Copy className="w-2.5 h-2.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </>
                )}
              </motion.button>
            </div>
          </div>

          {/* Commit Subject / Title */}
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 break-words leading-snug">
            {commit.subject}
          </div>

          {/* Commit Body Description */}
          {commit.body && (
            <div className="mt-2.5 text-xs text-slate-600 dark:text-[#8b949e]">
              <div
                className={`whitespace-pre-wrap font-sans leading-relaxed ${
                  !isBodyExpanded ? 'line-clamp-2' : ''
                }`}
              >
                {commit.body}
              </div>
              {commit.body.split('\n').length > 2 && (
                <button
                  onClick={() => setIsBodyExpanded(!isBodyExpanded)}
                  className="mt-1 text-indigo-500 hover:text-indigo-600 text-[11px] flex items-center gap-0.5 font-medium transition-colors"
                >
                  {isBodyExpanded ? (
                    <>收起说明 <ChevronUp className="w-3 h-3" /></>
                  ) : (
                    <>查看完整说明 <ChevronDown className="w-3 h-3" /></>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Footer stats and Toggle Diff Button */}
          <div className="mt-4 pt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 dark:border-[#30363d]/60 text-xs text-slate-500 dark:text-[#8b949e]">
            {/* Stats Pill */}
            <div className="flex items-center gap-3 px-3 py-1 rounded-full bg-slate-100/70 dark:bg-[#21262d]/70 text-[11px]">
              <span className="flex items-center gap-1 font-medium text-slate-600 dark:text-slate-300">
                <Files className="w-3 h-3 text-slate-400" />
                {commit.stats.filesChanged} 个文件
              </span>
              {commit.stats.additions > 0 && (
                <span className="flex items-center text-emerald-600 dark:text-emerald-400 font-mono font-semibold">
                  <Plus className="w-2.5 h-2.5" />
                  {commit.stats.additions}
                </span>
              )}
              {commit.stats.deletions > 0 && (
                <span className="flex items-center text-rose-600 dark:text-rose-400 font-mono font-semibold">
                  <Minus className="w-2.5 h-2.5" />
                  {commit.stats.deletions}
                </span>
              )}
            </div>

            {/* Actions on right: Rollback / Revert Action Menu + Diff Button */}
            <div className="flex items-center gap-2">
              {/* Rollback & Visual Operations Menu */}
              <div ref={actionMenuRef} className={`relative ${showActionMenu ? 'z-50' : 'z-auto'}`}>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleToggleActionMenu}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-[#21262d] dark:hover:bg-[#30363d] text-slate-700 dark:text-slate-200 transition-colors shadow-2xs"
                  title="回退、撤销与更多操作"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>回退 / 操作</span>
                  <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${showActionMenu ? 'rotate-180' : ''}`} />
                </motion.button>

                <AnimatePresence>
                  {showActionMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: menuPlacement === 'top' ? 8 : -8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: menuPlacement === 'top' ? 8 : -8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      style={{ zIndex: 999 }}
                      className={`absolute right-0 ${
                        menuPlacement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
                      } w-64 p-1.5 rounded-2xl bg-white dark:bg-[#161b22] border border-slate-200 dark:border-[#30363d] shadow-2xl z-50 space-y-1 text-xs`}
                      onClick={e => e.stopPropagation()}
                    >
                      <div className="font-semibold text-slate-400 text-[10px] px-2.5 py-1 uppercase tracking-wider">
                        提交操作 · {commit.shortHash}
                      </div>

                      {/* Reset to this commit */}
                      <button
                        onClick={() => {
                          setShowActionMenu(false);
                          setIsResetModalOpen(true);
                        }}
                        className="w-full flex items-start gap-2.5 px-3 py-2 rounded-xl text-left hover:bg-slate-100 dark:hover:bg-[#21262d] text-slate-700 dark:text-slate-200 transition-colors"
                      >
                        <RotateCcw className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-xs text-slate-800 dark:text-slate-100">回退到这个版本</span>
                            <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">安全首选</span>
                          </div>
                          <div className="text-[10px] text-slate-400 dark:text-[#8b949e]">代码不会丢失，随时可重新修改</div>
                        </div>
                      </button>

                      {/* Revert this commit */}
                      <button
                        onClick={handleRevert}
                        disabled={isReverting}
                        className="w-full flex items-start gap-2.5 px-3 py-2 rounded-xl text-left hover:bg-slate-100 dark:hover:bg-[#21262d] text-slate-700 dark:text-slate-200 transition-colors"
                      >
                        <Undo2 className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-xs text-slate-800 dark:text-slate-100">撤销此提交 (反向抵消)</span>
                            <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">团队推荐</span>
                          </div>
                          <div className="text-[10px] text-slate-400 dark:text-[#8b949e]">自动生成新提交抵消变动，安全不破坏历史</div>
                        </div>
                      </button>

                      <div className="border-t border-slate-100 dark:border-[#30363d] my-1" />

                      {/* Branch from here */}
                      <button
                        onClick={() => {
                          setShowActionMenu(false);
                          setIsBranchModalOpen(true);
                        }}
                        className="w-full flex items-start gap-2.5 px-3 py-2 rounded-xl text-left hover:bg-slate-100 dark:hover:bg-[#21262d] text-slate-700 dark:text-slate-200 transition-colors"
                      >
                        <GitBranch className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-semibold text-xs text-slate-800 dark:text-slate-100">从此处创建新分支</div>
                          <div className="text-[10px] text-slate-400 dark:text-[#8b949e]">从当前历史节点开启全新实验或功能</div>
                        </div>
                      </button>

                      {/* Copy Hash */}
                      <button
                        onClick={(e) => {
                          setShowActionMenu(false);
                          copyHash(e);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left hover:bg-slate-100 dark:hover:bg-[#21262d] text-slate-700 dark:text-slate-200 transition-colors"
                      >
                        <Copy className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="text-xs">复制完整提交ID (SHA)</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Toggle Diff Action - Pill Button */}
              <motion.button
                whileTap={{ scale: 0.96 }}
                onMouseEnter={() => prefetchCommitDiff(repoId, commit.hash)}
                onClick={() => setIsDiffExpanded(!isDiffExpanded)}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  isDiffExpanded
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-[#21262d] dark:hover:bg-[#30363d] text-slate-700 dark:text-slate-200'
                }`}
              >
                {isDiffExpanded ? (
                  <>
                    <span>收起代码变动</span>
                    <ChevronUp className="w-3.5 h-3.5" />
                  </>
                ) : (
                  <>
                    <span>查看代码变动 (Diff)</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </>
                )}
              </motion.button>
            </div>
          </div>

          {/* Inline Expanded Diff View */}
          <AnimatePresence initial={false}>
            {isDiffExpanded && (
              <motion.div
                key="diff-wrapper"
                initial={{ height: 0, opacity: 0 }}
                animate={{ 
                  height: 'auto', 
                  opacity: 1, 
                  transition: {
                    height: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
                    opacity: { duration: 0.24, ease: 'easeOut', delay: 0.04 }
                  }
                }}
                exit={{ 
                  height: 0, 
                  opacity: 0, 
                  transition: {
                    height: { duration: 0.26, ease: [0.16, 1, 0.3, 1] },
                    opacity: { duration: 0.14, ease: 'easeIn' }
                  }
                }}
                className="overflow-hidden"
              >
                <div className="pt-4 border-t border-slate-100 dark:border-[#30363d]/60 mt-3.5">
                  <CommitDiffView repoId={repoId} commit={commit} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Modals for Rollback & Branch Creation */}
      <RollbackModal
        isOpen={isResetModalOpen}
        repoId={repoId}
        commit={commit}
        onClose={() => setIsResetModalOpen(false)}
        onSuccess={() => onRefresh?.()}
      />

      <CreateBranchTagModal
        isOpen={isBranchModalOpen}
        mode="branch"
        repoId={repoId}
        startPoint={commit.hash}
        onClose={() => setIsBranchModalOpen(false)}
        onSuccess={() => onRefresh?.()}
      />
    </motion.div>
  );
});
