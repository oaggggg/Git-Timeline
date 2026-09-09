import React, { useState, useEffect, useCallback, useRef } from 'react';
import { RepoProvider, useRepo } from './context/RepoContext';
import { ThemeProvider } from './context/ThemeContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DateGroupHeader } from './components/timeline/DateGroupHeader';
import { CommitCard } from './components/timeline/CommitCard';
import { AddRepoModal } from './components/modals/AddRepoModal';
import { ScanRepoModal } from './components/modals/ScanRepoModal';
import { fetchCommits, fetchBranches } from './services/api';
import { CommitItem, BranchItem, TagItem, CommitFilterOptions } from './types';
import { groupCommitsByDate } from './utils/date';
import { 
  GitCommit, 
  Loader2, 
  FolderPlus, 
  Sparkles, 
  AlertCircle,
  Inbox
} from 'lucide-react';

const PAGE_SIZE = 30;

function MainTimeline() {
  const { activeRepo, isLoadingRepos } = useRepo();
  const [commits, setCommits] = useState<CommitItem[]>([]);
  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [filterOptions, setFilterOptions] = useState<CommitFilterOptions>({
    branch: 'ALL',
    skip: 0,
    limit: PAGE_SIZE
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);

  // Load branches & tags when active repo changes
  useEffect(() => {
    if (!activeRepo) {
      setCommits([]);
      setBranches([]);
      setTags([]);
      return;
    }

    fetchBranches(activeRepo.id)
      .then(res => {
        setBranches(res.branches);
        setTags(res.tags);
      })
      .catch(err => {
        console.warn('Failed to fetch branches:', err);
      });
  }, [activeRepo?.id]);

  // Load commits when activeRepo or filters change
  const loadCommits = useCallback(
    async (isLoadMore = false) => {
      if (!activeRepo) return;

      const skip = isLoadMore ? commits.length : 0;
      if (isLoadMore) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
        setError(null);
      }

      try {
        const res = await fetchCommits(activeRepo.id, {
          ...filterOptions,
          skip,
          limit: PAGE_SIZE
        });

        if (isLoadMore) {
          setCommits(prev => [...prev, ...res.commits]);
        } else {
          setCommits(res.commits);
        }
        setHasMore(res.hasMore);
      } catch (err: any) {
        setError(err.message || '加载提交记录失败');
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [activeRepo?.id, filterOptions, commits.length]
  );

  // Initial and filter changes
  useEffect(() => {
    loadCommits(false);
  }, [activeRepo?.id, filterOptions.branch, filterOptions.search, filterOptions.since, filterOptions.until, filterOptions.path]);

  const handleFilterChange = (newOptions: Partial<CommitFilterOptions>) => {
    setFilterOptions(prev => ({
      ...prev,
      ...newOptions,
      skip: 0
    }));
  };

  const dateGroups = groupCommitsByDate(commits);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-[#0d1117] text-slate-900 dark:text-[#e6edf3]">
      {/* Left Workspace Sidebar */}
      <Sidebar
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onOpenScanModal={() => setIsScanModalOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Header
          branches={branches}
          filterOptions={filterOptions}
          onFilterChange={handleFilterChange}
          onRefresh={() => loadCommits(false)}
          isLoading={isLoading}
        />

        {/* Timeline Scroll Area */}
        <main className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
          <div className="max-w-4xl mx-auto">
            {/* Error banner */}
            {error && (
              <div className="mb-6 flex items-center gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Empty state: No active repo */}
            {!activeRepo && !isLoadingRepos && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4">
                  <FolderPlus className="w-8 h-8" />
                </div>
                <h2 className="text-base font-bold mb-1 text-slate-800 dark:text-slate-100">
                  欢迎使用 Git Timeline
                </h2>
                <p className="text-xs text-slate-500 dark:text-[#8b949e] max-w-sm mb-6">
                  未选择或尚未添加任何本地 Git 仓库。你可以手动添加项目路径，或扫描父目录快速导入所有仓库。
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors"
                  >
                    <FolderPlus className="w-4 h-4" />
                    添加本地仓库
                  </button>
                  <button
                    onClick={() => setIsScanModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-[#30363d] hover:bg-slate-100 dark:hover:bg-[#21262d] transition-colors"
                  >
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    扫描父目录
                  </button>
                </div>
              </div>
            )}

            {/* Loading Initial Commits */}
            {isLoading && commits.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                <span className="text-xs">正在解析 Git 提交拓扑与历史记录...</span>
              </div>
            )}

            {/* Empty state: No commits found */}
            {!isLoading && activeRepo && commits.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Inbox className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-3" />
                <h3 className="text-sm font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  没有找到匹配的提交记录
                </h3>
                <p className="text-xs text-slate-400 max-w-xs">
                  当前筛选条件或搜索关键词未匹配到任何提交，请尝试重置搜索或选择其他分支。
                </p>
              </div>
            )}

            {/* Timeline Stream */}
            {activeRepo && dateGroups.length > 0 && (
              <div className="space-y-4">
                {dateGroups.map(group => (
                  <div key={group.dateKey} className="relative">
                    <DateGroupHeader
                      dateLabel={group.dateLabel}
                      commitCount={group.commits.length}
                    />
                    <div className="mt-2">
                      {group.commits.map(commit => (
                        <CommitCard
                          key={commit.hash}
                          repoId={activeRepo.id}
                          commit={commit}
                        />
                      ))}
                    </div>
                  </div>
                ))}

                {/* Load More Button / Indicator */}
                {hasMore && (
                  <div className="pt-4 pb-12 flex justify-center">
                    <button
                      onClick={() => loadCommits(true)}
                      disabled={isLoadingMore}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl border border-slate-200 dark:border-[#30363d] bg-white dark:bg-[#161b22] hover:bg-slate-100 dark:hover:bg-[#21262d] text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-xs transition-all disabled:opacity-50"
                    >
                      {isLoadingMore ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                          正在增量加载更多提交...
                        </>
                      ) : (
                        <>
                          <GitCommit className="w-4 h-4 text-indigo-500" />
                          加载更多提交记录
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Modals */}
      <AddRepoModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
      <ScanRepoModal
        isOpen={isScanModalOpen}
        onClose={() => setIsScanModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <RepoProvider>
        <MainTimeline />
      </RepoProvider>
    </ThemeProvider>
  );
}
