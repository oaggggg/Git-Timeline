import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CommitItem } from '../../types';
import { CommitDiffView } from '../diff/CommitDiffView';
import { useToast } from '../../context/ToastContext';
import { prefetchCommitDiff } from '../../services/api';
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
  Clock
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface CommitCardProps {
  repoId: string;
  commit: CommitItem;
}

export const CommitCard: React.FC<CommitCardProps> = ({ repoId, commit }) => {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);
  const [isDiffExpanded, setIsDiffExpanded] = useState(false);
  const [isBodyExpanded, setIsBodyExpanded] = useState(false);

  const copyHash = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(commit.hash);
    setCopied(true);
    showToast(`已复制 Commit SHA: ${commit.shortHash}`, 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const avatarBg = getAvatarColor(commit.authorName);
  const initials = commit.authorName.slice(0, 2).toUpperCase();

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
      layout="position"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ 
        duration: 0.2, 
        ease: 'easeOut',
        layout: { duration: 0.35, ease: [0.16, 1, 0.3, 1] }
      }}
      className="relative pl-8 pb-6 group"
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
        className={`rounded-3xl border transition-all duration-200 ${
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
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white shadow-xs shrink-0 select-none ring-2 ring-white dark:ring-[#161b22]"
                style={{ backgroundColor: avatarBg }}
              >
                {initials}
              </div>
              <div className="flex items-center gap-2 text-xs flex-wrap">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {commit.authorName}
                </span>
                <span className="text-slate-400 dark:text-[#8b949e]">
                  {relativeTime}
                </span>
                <span
                  className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-[#8b949e] font-mono bg-slate-100/90 dark:bg-[#21262d] px-2.5 py-0.5 rounded-full"
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
    </motion.div>
  );
};

function getAvatarColor(name: string): string {
  const colors = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', 
    '#8b5cf6', '#ec4899', '#06b6d4', '#6366f1'
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}
