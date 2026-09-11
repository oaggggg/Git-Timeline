import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, GitCompare } from 'lucide-react';
import { CommitItem } from '../../types';
import { compareCommits } from '../../services/api';

interface Props {
  repoId: string;
  base: CommitItem;
  head: CommitItem;
  onClose: () => void;
}

export const CompareCommitsModal: React.FC<Props> = ({ repoId, base, head, onClose }) => {
  const [diff, setDiff] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    compareCommits(repoId, base.hash, head.hash)
      .then(result => setDiff(result.diff))
      .catch(err => setError(err.message || '加载提交对比失败'));
  }, [repoId, base.hash, head.hash]);

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/45 p-4">
      <div className="flex max-h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-[#161b22]">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-[#30363d]">
          <div className="flex min-w-0 items-center gap-2">
            <GitCompare className="h-5 w-5 shrink-0 text-indigo-500" />
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Commit 对比</h2>
              <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                {base.shortHash} {base.subject ? `· ${base.subject}` : ''} → {head.shortHash} {head.subject ? `· ${head.subject}` : ''}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-[#21262d]" title="关闭">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto bg-[#0d1117] p-4">
          {error ? <p className="text-xs text-rose-400">{error}</p> : diff === null ? (
            <div className="flex items-center gap-2 text-xs text-slate-400"><Loader2 className="h-4 w-4 animate-spin" />正在加载对比...</div>
          ) : <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-slate-300">{diff || '两个提交之间没有代码差异。'}</pre>}
        </div>
      </div>
    </div>,
    document.body
  );
};
