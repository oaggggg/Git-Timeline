import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RepoProvider, useRepo } from './context/RepoContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DateGroupHeader, DateFilterRange, DATE_FILTER_OPTIONS } from './components/timeline/DateGroupHeader';
import { CommitCard } from './components/timeline/CommitCard';
import { fetchCommits, fetchBranches, fetchAuthors } from './services/api';
import { CommitItem, BranchItem, TagItem, CommitFilterOptions, AuthorItem } from './types';
import { groupCommitsByDate } from './utils/date';
import { startOfDay, endOfDay, subDays, format } from 'date-fns';
import { 
  GitCommit, 
  Loader2, 
  FolderOpen,
  AlertCircle,
  Inbox
} from 'lucide-react';

const PAGE_SIZE = 30;

function MainTimeline() {
  const { activeRepo, isLoadingRepos, openRepoDialog } = useRepo();
  const { showToast } = useToast();
  const [commits, setCommits] = useState<CommitItem[]>([]);
  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [authors, setAuthors] = useState<AuthorItem[]>([]);
  const [isLoadingAuthors, setIsLoadingAuthors] = useState(false);
  const [filterOptions, setFilterOptions] = useState<CommitFilterOptions>({
    branch: 'ALL',
    skip: 0,
    limit: PAGE_SIZE
  });
  const [dateFilter, setDateFilter] = useState<DateFilterRange>('ALL');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpeningRepo, setIsOpeningRepo] = useState(false);

  // Directly open system native folder picker
  const handleOpenNativeRepo = async () => {
    if (isOpeningRepo) return;
    setIsOpeningRepo(true);
    showToast('正在呼出系统文件夹选择器，请在窗口中选择...', 'info');
    try {
      const repo = await openRepoDialog();
      if (repo) {
        showToast(`已成功打开仓库: ${repo.name}`, 'success');
      } else {
        showToast('已取消选择文件夹', 'info');
      }
    } catch (err: any) {
      showToast(err.message || '打开仓库失败', 'error');
    } finally {
      setIsOpeningRepo(false);
    }
  };
  const observerTarget = useRef<HTMLDivElement | null>(null);

  const loadAuthors = useCallback(async (repoId: string) => {
    setIsLoadingAuthors(true);
    try {
      const res = await fetchAuthors(repoId);
      setAuthors(res);
    } catch (err) {
      console.warn('Failed to fetch authors:', err);
    } finally {
      setIsLoadingAuthors(false);
    }
  }, []);

  // When active repo changes: reset filters, load branches and authors
  useEffect(() => {
    if (!activeRepo) {
      setCommits([]);
      setBranches([]);
      setTags([]);
      setAuthors([]);
      return;
    }

    setFilterOptions({
      branch: 'ALL',
      skip: 0,
      limit: PAGE_SIZE,
      search: undefined,
      author: undefined,
      since: undefined,
      until: undefined
    });
    setDateFilter('ALL');

    fetchBranches(activeRepo.id)
      .then(res => {
        setBranches(res.branches);
        setTags(res.tags);
      })
      .catch(err => {
        console.warn('Failed to fetch branches:', err);
      });

    loadAuthors(activeRepo.id);
  }, [activeRepo?.id, loadAuthors]);

  // Load commits callback
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

  // Trigger load on filter change
  useEffect(() => {
    loadCommits(false);
  }, [
    activeRepo?.id, 
    filterOptions.branch, 
    filterOptions.search, 
    filterOptions.author,
    filterOptions.since, 
    filterOptions.until, 
    filterOptions.path
  ]);

  // Infinite scroll intersection observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !isLoading && !isLoadingMore) {
          loadCommits(true);
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, isLoading, isLoadingMore, loadCommits]);

  const handleFilterChange = (newOptions: Partial<CommitFilterOptions>) => {
    setFilterOptions(prev => ({
      ...prev,
      ...newOptions,
      skip: 0
    }));
  };

  const handleDateFilterChange = (range: DateFilterRange) => {
    setDateFilter(range);
    let since: string | undefined;
    let until: string | undefined;

    const now = new Date();
    if (range === 'today') {
      since = format(startOfDay(now), "yyyy-MM-dd'T'HH:mm:ss");
    } else if (range === 'yesterday') {
      const yesterday = subDays(now, 1);
      since = format(startOfDay(yesterday), "yyyy-MM-dd'T'HH:mm:ss");
      until = format(endOfDay(yesterday), "yyyy-MM-dd'T'HH:mm:ss");
    } else if (range === '7days') {
      const d7 = subDays(now, 7);
      since = format(startOfDay(d7), "yyyy-MM-dd'T'HH:mm:ss");
    } else if (range === '30days') {
      const d30 = subDays(now, 30);
      since = format(startOfDay(d30), "yyyy-MM-dd'T'HH:mm:ss");
    }

    handleFilterChange({ since, until, skip: 0 });
  };

  const handleRefresh = () => {
    loadCommits(false);
    if (activeRepo) {
      fetchBranches(activeRepo.id)
        .then(res => {
          setBranches(res.branches);
          setTags(res.tags);
        })
        .catch(() => {});
      loadAuthors(activeRepo.id);
    }
    showToast('提交记录已刷新', 'info');
  };

  const dateGroups = groupCommitsByDate(commits);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-[#0d1117] text-slate-900 dark:text-[#e6edf3]">
      {/* Left Workspace Sidebar */}
      <Sidebar 
        onOpenRepo={handleOpenNativeRepo} 
        isOpeningRepo={isOpeningRepo}
        authors={authors}
        selectedAuthor={filterOptions.author}
        onSelectAuthor={authorName => {
          handleFilterChange({ author: authorName, skip: 0 });
        }}
        isLoadingAuthors={isLoadingAuthors}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden [contain:content]">
        <Header
          branches={branches}
          filterOptions={filterOptions}
          onFilterChange={handleFilterChange}
          onRefresh={handleRefresh}
          isLoading={isLoading}
        />

        {/* Timeline Scroll Area - top-0 aligned so sticky date headers work perfectly */}
        <main className="flex-1 overflow-y-auto px-4 md:px-8 pb-16">
          <div className="max-w-4xl mx-auto">
            {/* Error banner */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-4 mb-6 flex items-center gap-2.5 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 text-xs shadow-xs"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Empty state: No active repo */}
            {!activeRepo && !isLoadingRepos && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-28 text-center"
              >
                <div className="w-20 h-20 rounded-3xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-5 shadow-sm">
                  <FolderOpen className="w-10 h-10" />
                </div>
                <h2 className="text-lg font-bold mb-2 text-slate-800 dark:text-slate-100">
                  欢迎使用 Git Timeline
                </h2>
                <p className="text-xs text-slate-500 dark:text-[#8b949e] max-w-sm mb-7 leading-relaxed">
                  未选择或尚未打开任何本地 Git 仓库。你可以直接选择并打开本地仓库目录。
                </p>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={handleOpenNativeRepo}
                  disabled={isOpeningRepo}
                  className="flex items-center gap-2 px-6 py-2.5 text-xs font-semibold rounded-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-75 text-white shadow-xs transition-colors"
                >
                  {isOpeningRepo ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FolderOpen className="w-4 h-4" />
                  )}
                  <span>{isOpeningRepo ? '请在系统窗口中选择...' : '打开本地仓库'}</span>
                </motion.button>
              </motion.div>
            )}

            {/* Loading Skeleton */}
            {isLoading && commits.length === 0 && (
              <div className="space-y-4 py-6">
                {[1, 2, 3].map(n => (
                  <div
                    key={n}
                    className="rounded-3xl border border-slate-200/80 dark:border-[#30363d] bg-white/70 dark:bg-[#161b22]/70 p-6 space-y-3.5 animate-pulse"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-[#30363d]" />
                        <div className="w-28 h-3.5 bg-slate-200 dark:bg-[#30363d] rounded-full" />
                      </div>
                      <div className="w-20 h-5 bg-slate-200 dark:bg-[#30363d] rounded-full" />
                    </div>
                    <div className="w-3/4 h-4.5 bg-slate-200 dark:bg-[#30363d] rounded-xl" />
                    <div className="w-1/2 h-3.5 bg-slate-200 dark:bg-[#30363d] rounded-xl" />
                  </div>
                ))}
              </div>
            )}

            {/* Empty state: No commits found */}
            {!isLoading && activeRepo && commits.length === 0 && (
              <div className="space-y-4">
                <DateGroupHeader
                  dateLabel={
                    dateFilter === 'ALL'
                      ? '全部时间'
                      : (DATE_FILTER_OPTIONS.find(o => o.key === dateFilter)?.label || '日期筛选')
                  }
                  commitCount={0}
                  isFirstGroup={true}
                  activeFilter={dateFilter}
                  onFilterChange={handleDateFilterChange}
                />
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-20 text-center"
                >
                  <div className="p-4 rounded-3xl bg-slate-100 dark:bg-[#21262d] text-slate-400 mb-3.5">
                    <Inbox className="w-9 h-9" />
                  </div>
                  <h3 className="text-sm font-bold mb-1.5 text-slate-700 dark:text-slate-300">
                    没有找到匹配的提交记录
                  </h3>
                  <p className="text-xs text-slate-400 max-w-xs leading-relaxed mb-4">
                    {dateFilter !== 'ALL'
                      ? `在所选的【${DATE_FILTER_OPTIONS.find(o => o.key === dateFilter)?.label}】时间范围内暂无提交记录`
                      : '当前筛选条件或搜索关键词未匹配到任何提交，请重置搜索或选择其他分支。'}
                  </p>
                  {dateFilter !== 'ALL' && (
                    <button
                      type="button"
                      onClick={() => handleDateFilterChange('ALL')}
                      className="px-4 py-2 rounded-full text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/80 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-400 transition-colors shadow-xs"
                    >
                      重置为全部时间
                    </button>
                  )}
                </motion.div>
              </div>
            )}

            {/* Timeline Stream */}
            {activeRepo && dateGroups.length > 0 && (
              <div className="space-y-2">
                {dateGroups.map((group, index) => (
                  <div key={group.dateKey} className="relative">
                    <DateGroupHeader
                      dateLabel={group.dateLabel}
                      commitCount={group.commits.length}
                      isFirstGroup={index === 0}
                      activeFilter={dateFilter}
                      onFilterChange={handleDateFilterChange}
                    />
                    <div className="mt-1" data-tour="timeline-card">
                      {group.commits.map(commit => (
                        <CommitCard
                          key={commit.hash}
                          repoId={activeRepo.id}
                          commit={commit}
                          onRefresh={handleRefresh}
                        />
                      ))}
                    </div>
                  </div>
                ))}

                {/* Infinite Scroll Sentinel */}
                <div ref={observerTarget} className="pt-4 pb-8 flex justify-center">
                  {isLoadingMore ? (
                    <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                      <span>正在增量加载更多提交记录...</span>
                    </div>
                  ) : hasMore ? (
                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      onClick={() => loadCommits(true)}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-full border border-slate-200 dark:border-[#30363d] bg-white dark:bg-[#161b22] hover:bg-slate-100 dark:hover:bg-[#21262d] text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-xs transition-all"
                    >
                      <GitCommit className="w-4 h-4 text-indigo-500" />
                      <span>加载更多提交记录</span>
                    </motion.button>
                  ) : (
                    <div className="text-[11px] text-slate-400 py-4 select-none font-medium">
                      已展示全部提交记录
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <RepoProvider>
          <MainTimeline />
        </RepoProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
