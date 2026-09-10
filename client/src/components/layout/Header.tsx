import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRepo } from '../../context/RepoContext';
import { useToast } from '../../context/ToastContext';
import { BranchItem, CommitFilterOptions } from '../../types';
import { gitPull, gitPush, gitStash, fetchRepoStatus, gitUndoLastCommit, gitDiscardChanges, deleteBranch } from '../../services/api';
import { CommitModal } from '../modals/CommitModal';
import { PublishGitHubModal } from '../modals/PublishGitHubModal';
import { CreateBranchTagModal } from '../modals/CreateBranchTagModal';
import { CreatePrModal } from '../modals/CreatePrModal';
import { ConfirmActionModal } from '../modals/ConfirmActionModal';
import { InteractiveTour } from '../common/InteractiveTour';
import { GithubIcon } from '../common/GithubIcon';
import { ThemeSlider } from './ThemeSlider';
import { 
  GitBranch, 
  GitCommit, 
  GitPullRequest,
  ArrowDownToLine,
  ArrowUpFromLine,
  Tag,
  Archive,
  ArchiveRestore,
  MoreHorizontal,
  Search, 
  RotateCw, 
  Check, 
  ChevronDown,
  Undo2,
  Trash2,
  HelpCircle
} from 'lucide-react';

interface HeaderProps {
  branches: BranchItem[];
  filterOptions: CommitFilterOptions;
  onFilterChange: (newOptions: Partial<CommitFilterOptions>) => void;
  onRefresh: () => void;
  isLoading: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  branches,
  filterOptions,
  onFilterChange,
  onRefresh,
  isLoading
}) => {
  const { activeRepo } = useRepo();
  const { showToast, dismissToast } = useToast();
  const [showBranchMenu, setShowBranchMenu] = useState(false);

  // Expandable Search State & Refs
  const [isSearchExpanded, setIsSearchExpanded] = useState(Boolean(filterOptions.search));
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Git Visual Actions State
  const [isCommitModalOpen, setIsCommitModalOpen] = useState(false);
  const [isGitHubModalOpen, setIsGitHubModalOpen] = useState(false);
  const [isPrModalOpen, setIsPrModalOpen] = useState(false);
  const [isBranchTagModalOpen, setIsBranchTagModalOpen] = useState(false);
  const [branchTagModalMode, setBranchTagModalMode] = useState<'branch' | 'tag'>('branch');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [pendingChangesCount, setPendingChangesCount] = useState<number>(0);
  const [isUndoModalOpen, setIsUndoModalOpen] = useState(false);
  const [isDiscardModalOpen, setIsDiscardModalOpen] = useState(false);
  const [isUndoing, setIsUndoing] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [branchToDelete, setBranchToDelete] = useState<string | null>(null);
  const [isDeleteBranchModalOpen, setIsDeleteBranchModalOpen] = useState(false);
  const [isDeletingBranch, setIsDeletingBranch] = useState(false);
  const [isForceDelete, setIsForceDelete] = useState(false);

  // Container refs for detecting click-outside
  const branchMenuRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Open search with smooth expand
  const handleOpenSearch = () => {
    setIsSearchExpanded(true);
  };

  // Auto-focus search input whenever search expands
  useEffect(() => {
    if (isSearchExpanded) {
      const focusSearch = () => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      };

      focusSearch();
      const rId = requestAnimationFrame(focusSearch);
      const t1 = setTimeout(focusSearch, 60);
      const t2 = setTimeout(focusSearch, 160);
      const t3 = setTimeout(focusSearch, 260);

      return () => {
        cancelAnimationFrame(rId);
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [isSearchExpanded]);

  // Close search and automatically clear query
  const handleCloseSearch = () => {
    setIsSearchExpanded(false);
    if (filterOptions.search) {
      onFilterChange({ search: undefined, skip: 0 });
    }
  };

  // Global '/' keyboard shortcut to trigger search
  useEffect(() => {
    const handleGlobalSlash = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();
      if (tagName === 'input' || tagName === 'textarea' || target?.isContentEditable) {
        return;
      }
      if (e.key === '/') {
        e.preventDefault();
        handleOpenSearch();
      }
    };
    window.addEventListener('keydown', handleGlobalSlash);
    return () => window.removeEventListener('keydown', handleGlobalSlash);
  }, []);

  // Close dropdown menus and empty search on click outside or Escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;

      if (branchMenuRef.current && !branchMenuRef.current.contains(target)) {
        setShowBranchMenu(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(target)) {
        setShowMoreMenu(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(target)) {
        if (isSearchExpanded) {
          handleCloseSearch();
        }
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowBranchMenu(false);
        setShowMoreMenu(false);
        if (isSearchExpanded) {
          handleCloseSearch();
        }
      }
    };

    document.addEventListener('pointerdown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSearchExpanded, filterOptions.search]);

  // Load status to get pending changes count
  useEffect(() => {
    if (!activeRepo) {
      setPendingChangesCount(0);
      return;
    }
    fetchRepoStatus(activeRepo.id)
      .then(res => setPendingChangesCount(res.files.length))
      .catch(() => {});
  }, [activeRepo?.id, isLoading]);

  const handlePull = async () => {
    if (!activeRepo || isPulling) return;
    setIsPulling(true);
    const loadingToastId = showToast('正在拉取远程分支更新 (git pull)...', 'loading');
    try {
      const res = await gitPull(activeRepo.id);
      dismissToast(loadingToastId);
      showToast(res.output?.trim() || '已成功拉取最新代码', 'success');
      onRefresh();
    } catch (err: any) {
      dismissToast(loadingToastId);
      const isNoRemote = err.code === 'NO_REMOTE' || /尚未配置远程仓库/.test(err.message || '');
      showToast(
        err.message || '拉取失败，请检查远程分支配置或冲突', 
        'error',
        isNoRemote ? 8000 : 6000,
        isNoRemote ? { label: '关联 GitHub 仓库', onClick: () => setIsGitHubModalOpen(true) } : undefined
      );
    } finally {
      setIsPulling(false);
    }
  };

  const handlePush = async () => {
    if (!activeRepo || isPushing) return;
    setIsPushing(true);
    const loadingToastId = showToast('正在推送到远程 (git push)...', 'loading');
    try {
      const res = await gitPush(activeRepo.id);
      dismissToast(loadingToastId);
      showToast(res.output?.trim() || '已成功推送到远程', 'success');
      onRefresh();
    } catch (err: any) {
      dismissToast(loadingToastId);
      const isNoRemote = err.code === 'NO_REMOTE' || /尚未配置远程仓库/.test(err.message || '');
      showToast(
        err.message || '推送失败，可尝试使用「发布到 GitHub」关联远程分支', 
        'error',
        isNoRemote ? 8000 : 6000,
        isNoRemote ? { label: '关联 GitHub 仓库', onClick: () => setIsGitHubModalOpen(true) } : undefined
      );
    } finally {
      setIsPushing(false);
    }
  };

  const handleStash = async (action: 'stash' | 'pop') => {
    if (!activeRepo) return;
    setShowMoreMenu(false);
    try {
      await gitStash(activeRepo.id, action);
      showToast(
        action === 'stash' 
          ? '工作区代码变动已成功暂存 (git stash)' 
          : '已成功恢复暂存变动 (stash pop)', 
        'success'
      );
      onRefresh();
    } catch (err: any) {
      showToast(err.message || '暂存操作失败', 'error');
    }
  };

  const handleConfirmUndoCommit = async () => {
    if (!activeRepo || isUndoing) return;
    setIsUndoing(true);
    const loadingToastId = showToast('正在撤回最后一次提交...', 'loading');
    try {
      await gitUndoLastCommit(activeRepo.id);
      dismissToast(loadingToastId);
      showToast('已成功撤回最后一次提交，代码变动已保留至暂存区', 'success');
      setIsUndoModalOpen(false);
      onRefresh();
      fetchRepoStatus(activeRepo.id)
        .then(res => setPendingChangesCount(res.files.length))
        .catch(() => {});
    } catch (err: any) {
      dismissToast(loadingToastId);
      showToast(err.message || '撤回提交失败', 'error');
    } finally {
      setIsUndoing(false);
    }
  };

  const handleConfirmDiscardChanges = async () => {
    if (!activeRepo || isDiscarding) return;
    setIsDiscarding(true);
    const loadingToastId = showToast('正在放弃工作区所有修改...', 'loading');
    try {
      await gitDiscardChanges(activeRepo.id);
      dismissToast(loadingToastId);
      showToast('已彻底放弃工作区所有未提交修改', 'success');
      setIsDiscardModalOpen(false);
      onRefresh();
      fetchRepoStatus(activeRepo.id)
        .then(res => setPendingChangesCount(res.files.length))
        .catch(() => {});
    } catch (err: any) {
      dismissToast(loadingToastId);
      showToast(err.message || '放弃修改失败', 'error');
    } finally {
      setIsDiscarding(false);
    }
  };

  const handleConfirmDeleteBranch = async () => {
    if (!activeRepo || !branchToDelete || isDeletingBranch) return;
    setIsDeletingBranch(true);
    const loadingToastId = showToast(`正在删除分支 "${branchToDelete}"...`, 'loading');
    try {
      await deleteBranch(activeRepo.id, branchToDelete, isForceDelete);
      dismissToast(loadingToastId);
      showToast(
        isForceDelete
          ? `已强制删除分支 "${branchToDelete}"`
          : `已成功删除分支 "${branchToDelete}"`,
        'success'
      );
      if (filterOptions.branch === branchToDelete) {
        onFilterChange({ branch: 'ALL', skip: 0 });
      }
      setIsDeleteBranchModalOpen(false);
      setBranchToDelete(null);
      setIsForceDelete(false);
      onRefresh();
    } catch (err: any) {
      dismissToast(loadingToastId);
      if (err.canForce || /not fully merged/i.test(err.message || '')) {
        setIsForceDelete(true);
      } else {
        showToast(err.message || '删除分支失败', 'error');
        setIsDeleteBranchModalOpen(false);
        setBranchToDelete(null);
        setIsForceDelete(false);
      }
    } finally {
      setIsDeletingBranch(false);
    }
  };

  const activeBranch = filterOptions.branch || 'ALL';

  return (
    <>
      <header className="h-16 px-4 lg:px-6 flex items-center justify-between gap-3 border-b bg-white/80 dark:bg-[#161b22]/80 backdrop-blur-md border-slate-200/80 dark:border-[#30363d] text-slate-800 dark:text-[#e6edf3] sticky top-0 z-30 select-none shadow-xs">
      {/* Left: Active Repo Info & Branch Selector */}
      <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
        <div className="shrink-0 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold truncate tracking-tight max-w-[110px] sm:max-w-[170px]" title={activeRepo?.name}>
              {activeRepo ? activeRepo.name : '未选择仓库'}
            </h1>
            {activeRepo && (
              <span
                className="hidden 2xl:inline-block text-[11px] text-slate-400 dark:text-[#8b949e] font-mono truncate max-w-[150px] px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-[#21262d]"
                title={activeRepo.path}
              >
                {activeRepo.path}
              </span>
            )}
          </div>
        </div>

        {/* Custom Rounded Pill Branch Selector */}
        {activeRepo && (
          <div ref={branchMenuRef} data-tour="branch-selector" className="relative shrink-0">
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => setShowBranchMenu(!showBranchMenu)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-full bg-slate-100/90 dark:bg-[#21262d] border border-slate-200 dark:border-[#30363d] hover:border-slate-300 dark:hover:border-slate-500 transition-colors shadow-xs whitespace-nowrap shrink-0"
            >
              <GitBranch className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span className="truncate max-w-[110px] whitespace-nowrap">
                {activeBranch === 'ALL' ? '全部分支' : activeBranch}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform shrink-0 ${showBranchMenu ? 'rotate-180' : ''}`} />
            </motion.button>

            {/* Branch Menu Dropdown */}
            <AnimatePresence>
              {showBranchMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-0 mt-2 w-64 p-2 rounded-2xl bg-white dark:bg-[#161b22] border border-slate-200 dark:border-[#30363d] shadow-2xl z-40 space-y-1 text-xs max-h-80 overflow-y-auto"
                >
                  <div className="font-semibold text-slate-400 text-[11px] px-2.5 py-1 uppercase tracking-wider">
                    分支切换与管理
                  </div>
                  
                  {/* All branches option */}
                  <button
                    onClick={() => {
                      onFilterChange({ branch: 'ALL', skip: 0 });
                      setShowBranchMenu(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors ${
                      activeBranch === 'ALL'
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold'
                        : 'hover:bg-slate-100 dark:hover:bg-[#21262d] text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span>全部分支 (--all)</span>
                    {activeBranch === 'ALL' && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />}
                  </button>

                  {/* Local Branches */}
                  <div className="font-semibold text-slate-400 text-[10px] px-2.5 pt-2 pb-0.5 uppercase tracking-wider border-t border-slate-100 dark:border-[#30363d]">
                    本地分支
                  </div>
                  {branches
                    .filter(b => !b.isRemote)
                    .map(b => {
                      const isSelected = activeBranch === b.name;
                      return (
                        <div
                          key={b.name}
                          className={`w-full group flex items-center justify-between px-3 py-1.5 rounded-xl transition-colors ${
                            isSelected
                              ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold'
                              : 'hover:bg-slate-100 dark:hover:bg-[#21262d] text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              onFilterChange({ branch: b.name, skip: 0 });
                              setShowBranchMenu(false);
                            }}
                            className="flex items-center gap-2 truncate flex-1 text-left min-w-0"
                          >
                            <span className="truncate">{b.name}</span>
                            {b.current && (
                              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 shrink-0">
                                HEAD
                              </span>
                            )}
                          </button>

                          <div className="flex items-center gap-1 shrink-0 ml-1.5">
                            {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />}
                            {!b.current && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setBranchToDelete(b.name);
                                  setIsForceDelete(false);
                                  setIsDeleteBranchModalOpen(true);
                                  setShowBranchMenu(false);
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-rose-100 dark:hover:bg-rose-950/60 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-all"
                                title={`删除本地分支 ${b.name}`}
                              >
                                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}

                  {/* Remote Branches */}
                  {branches.some(b => b.isRemote) && (
                    <>
                      <div className="font-semibold text-slate-400 text-[10px] px-2.5 pt-2 pb-0.5 uppercase tracking-wider border-t border-slate-100 dark:border-[#30363d]">
                        远程分支
                      </div>
                      {branches
                        .filter(b => b.isRemote)
                        .map(b => {
                          const isSelected = activeBranch === b.name;
                          return (
                            <button
                              key={b.name}
                              onClick={() => {
                                onFilterChange({ branch: b.name, skip: 0 });
                                setShowBranchMenu(false);
                              }}
                              className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-left transition-colors ${
                                isSelected
                                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold'
                                  : 'hover:bg-slate-100 dark:hover:bg-[#21262d] text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              <span className="truncate">{b.name}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />}
                            </button>
                          );
                        })}
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Visual Git Actions Toolbar */}
        {activeRepo && (
          <div data-tour="actions-toolbar" className="flex items-center gap-1.5 pl-2 border-l border-slate-200/80 dark:border-[#30363d] shrink-0">
            {/* Manual Commit Button */}
            <motion.button
              data-tour="commit-btn"
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsCommitModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-all whitespace-nowrap shrink-0 cursor-pointer"
              title="保存并提交当前写好的代码 (保存在本地/一键推送到云端)"
            >
              <GitCommit className="w-3.5 h-3.5 shrink-0" />
              <span className="whitespace-nowrap">保存并提交</span>
              {pendingChangesCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-white/25 text-[10px] flex items-center justify-center font-bold shrink-0" title={`${pendingChangesCount} 个待保存的变动文件`}>
                  {pendingChangesCount}
                </span>
              )}
            </motion.button>

            {/* Pull Button */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handlePull}
              disabled={isPulling}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-full bg-slate-100 dark:bg-[#21262d] hover:bg-slate-200 dark:hover:bg-[#30363d] text-slate-700 dark:text-slate-200 transition-colors shadow-xs whitespace-nowrap shrink-0"
              title="拉取远程更新 (把云端最新变动同步到本地电脑)"
            >
              <ArrowDownToLine className={`w-3.5 h-3.5 text-indigo-500 shrink-0 ${isPulling ? 'animate-bounce' : ''}`} />
              <span className="whitespace-nowrap">{isPulling ? '拉取中...' : '拉取最新'}</span>
            </motion.button>

            {/* Push Button */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handlePush}
              disabled={isPushing}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-full bg-slate-100 dark:bg-[#21262d] hover:bg-slate-200 dark:hover:bg-[#30363d] text-slate-700 dark:text-slate-200 transition-colors shadow-xs whitespace-nowrap shrink-0"
              title="推送到远程 (把本地存好的历史记录上传到 GitHub)"
            >
              <ArrowUpFromLine className={`w-3.5 h-3.5 text-indigo-500 shrink-0 ${isPushing ? 'animate-bounce' : ''}`} />
              <span className="whitespace-nowrap">{isPushing ? '推送中...' : '推送到云端'}</span>
            </motion.button>

            {/* Publish to GitHub Button */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsGitHubModalOpen(true)}
              className="hidden xl:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full bg-slate-100 dark:bg-[#21262d] hover:bg-slate-200 dark:hover:bg-[#30363d] text-slate-700 dark:text-slate-200 transition-colors shadow-xs whitespace-nowrap shrink-0"
              title="发布或同步到 GitHub"
            >
              <GithubIcon className="w-3.5 h-3.5 text-slate-800 dark:text-slate-200 shrink-0" />
              <span className="whitespace-nowrap">发布到 GitHub</span>
            </motion.button>

            {/* Create PR Button */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsPrModalOpen(true)}
              className="hidden 2xl:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full bg-slate-100 dark:bg-[#21262d] hover:bg-slate-200 dark:hover:bg-[#30363d] text-slate-700 dark:text-slate-200 transition-colors shadow-xs whitespace-nowrap shrink-0"
              title="提交代码合并请求 (Pull Request)"
            >
              <GitPullRequest className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span className="whitespace-nowrap">提交 PR</span>
            </motion.button>

            {/* More Git Actions Menu */}
            <div ref={moreMenuRef} className="relative shrink-0">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className="w-7 h-7 rounded-full flex items-center justify-center bg-slate-100 dark:bg-[#21262d] hover:bg-slate-200 dark:hover:bg-[#30363d] text-slate-600 dark:text-slate-300 transition-colors shadow-xs shrink-0"
                title="更多 Git 操作"
              >
                <MoreHorizontal className="w-4 h-4 shrink-0" />
              </motion.button>

              <AnimatePresence>
                {showMoreMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-0 mt-2 w-64 p-2 rounded-2xl bg-white dark:bg-[#161b22] border border-slate-200 dark:border-[#30363d] shadow-2xl z-40 space-y-1 text-xs"
                    >
                      <button
                        onClick={() => {
                          setShowMoreMenu(false);
                          setIsPrModalOpen(true);
                        }}
                        className="w-full flex items-start gap-2.5 px-3 py-2 rounded-xl text-left hover:bg-slate-100 dark:hover:bg-[#21262d] text-slate-700 dark:text-slate-200 transition-colors"
                      >
                        <GitPullRequest className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-semibold text-xs">提交 PR (Pull Request)</div>
                          <div className="text-[10px] text-slate-400 dark:text-[#8b949e]">请求合并：发起代码评审合并进主干</div>
                        </div>
                      </button>
                      <button
                        onClick={() => {
                          setShowMoreMenu(false);
                          setIsGitHubModalOpen(true);
                        }}
                        className="w-full flex items-start gap-2.5 px-3 py-2 rounded-xl text-left hover:bg-slate-100 dark:hover:bg-[#21262d] text-slate-700 dark:text-slate-200 transition-colors"
                      >
                        <GithubIcon className="w-4 h-4 text-slate-800 dark:text-slate-200 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-semibold text-xs">发布到 GitHub (Publish)</div>
                          <div className="text-[10px] text-slate-400 dark:text-[#8b949e]">远程托管：将本地仓库推送到 GitHub 远程</div>
                        </div>
                      </button>
                      <button
                        onClick={() => {
                          setShowMoreMenu(false);
                          setBranchTagModalMode('branch');
                          setIsBranchTagModalOpen(true);
                        }}
                        className="w-full flex items-start gap-2.5 px-3 py-2 rounded-xl text-left hover:bg-slate-100 dark:hover:bg-[#21262d] text-slate-700 dark:text-slate-200 transition-colors"
                      >
                        <GitBranch className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-semibold text-xs">新建分支 (Branch)</div>
                          <div className="text-[10px] text-slate-400 dark:text-[#8b949e]">安全沙盒：独立平行路线，不影响主干</div>
                        </div>
                      </button>
                      <button
                        onClick={() => {
                          setShowMoreMenu(false);
                          setBranchTagModalMode('tag');
                          setIsBranchTagModalOpen(true);
                        }}
                        className="w-full flex items-start gap-2.5 px-3 py-2 rounded-xl text-left hover:bg-slate-100 dark:hover:bg-[#21262d] text-slate-700 dark:text-slate-200 transition-colors"
                      >
                        <Tag className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-semibold text-xs">打版本标签 (Tag)</div>
                          <div className="text-[10px] text-slate-400 dark:text-[#8b949e]">里程碑：给重要发布盖戳 (如 v1.0.0)</div>
                        </div>
                      </button>
                      <div className="border-t border-slate-100 dark:border-[#30363d] my-1" />
                      <button
                        onClick={() => handleStash('stash')}
                        className="w-full flex items-start gap-2.5 px-3 py-2 rounded-xl text-left hover:bg-slate-100 dark:hover:bg-[#21262d] text-slate-700 dark:text-slate-200 transition-colors"
                      >
                        <Archive className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-semibold text-xs">暂存工作区 (Stash)</div>
                          <div className="text-[10px] text-slate-400 dark:text-[#8b949e]">临时收纳：手头活临时藏起，清理工作区</div>
                        </div>
                      </button>
                      <button
                        onClick={() => handleStash('pop')}
                        className="w-full flex items-start gap-2.5 px-3 py-2 rounded-xl text-left hover:bg-slate-100 dark:hover:bg-[#21262d] text-slate-700 dark:text-slate-200 transition-colors"
                      >
                        <ArchiveRestore className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-semibold text-xs">恢复暂存 (Stash Pop)</div>
                          <div className="text-[10px] text-slate-400 dark:text-[#8b949e]">取回收纳：把刚才收起的改动放出来继续写</div>
                        </div>
                      </button>
                      <div className="border-t border-slate-100 dark:border-[#30363d] my-1" />
                      <button
                        onClick={() => {
                          setShowMoreMenu(false);
                          setIsUndoModalOpen(true);
                        }}
                        className="w-full flex items-start gap-2.5 px-3 py-2 rounded-xl text-left hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-600 dark:text-amber-400 transition-colors"
                      >
                        <Undo2 className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-semibold text-xs">撤回上次提交 (Undo)</div>
                          <div className="text-[10px] text-amber-600/80 dark:text-amber-400/80">安全后悔药：撤回上个记录，代码完好保留</div>
                        </div>
                      </button>
                      <button
                        onClick={() => {
                          setShowMoreMenu(false);
                          setIsDiscardModalOpen(true);
                        }}
                        className="w-full flex items-start gap-2.5 px-3 py-2 rounded-xl text-left hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-semibold text-xs">放弃工作区修改 (Discard)</div>
                          <div className="text-[10px] text-rose-500/80 dark:text-rose-400/80">清空草稿：彻底放弃未保存改动</div>
                        </div>
                      </button>
                    </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>

      {/* Center/Right: Expandable Search, Theme Slider, Refresh */}
      <div data-tour="search-and-theme" className="flex items-center gap-2.5 shrink-0">
        {/* Expandable Search Component */}
        <div ref={searchContainerRef} className="relative shrink-0 flex items-center">
          <AnimatePresence initial={false} mode="wait">
            {!isSearchExpanded ? (
              <motion.button
                key="search-trigger-btn"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.15 }}
                whileTap={{ scale: 0.92 }}
                onClick={handleOpenSearch}
                className="flex items-center gap-1.5 h-8 px-2.5 rounded-full bg-slate-100/90 dark:bg-[#21262d] border border-slate-200/80 dark:border-[#30363d] hover:border-slate-300 dark:hover:border-slate-500 text-slate-600 dark:text-[#8b949e] shadow-xs transition-colors shrink-0"
                title="呼出搜索 (快捷键 /)"
              >
                <Search className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span className="text-[10px] font-mono font-medium text-slate-400 dark:text-slate-500 px-1 py-0.2 rounded bg-slate-200/70 dark:bg-[#30363d] leading-none">
                  /
                </span>
              </motion.button>
            ) : (
              <motion.div
                key="search-expanded-box"
                initial={{ width: 36, opacity: 0 }}
                animate={{ width: 175, opacity: 1 }}
                exit={{ width: 36, opacity: 0 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className="relative flex items-center h-8"
              >
                <Search className="w-3.5 h-3.5 absolute left-2.5 text-indigo-500 pointer-events-none shrink-0" />
                <input
                  ref={el => {
                    (searchInputRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
                    if (el) {
                      el.focus();
                    }
                  }}
                  autoFocus
                  type="text"
                  placeholder="搜索提交、作者、SHA"
                  value={filterOptions.search || ''}
                  onChange={e => onFilterChange({ search: e.target.value || undefined, skip: 0 })}
                  onKeyDown={e => {
                    if (e.key === 'Escape') {
                      handleCloseSearch();
                    }
                  }}
                  className="w-full h-8 pl-8 pr-3 text-xs rounded-full bg-slate-100/90 dark:bg-[#0d1117] border border-indigo-500/70 focus:border-indigo-500 focus:bg-white dark:focus:bg-[#0d1117] focus:outline-none focus:ring-0 ring-0 shadow-none text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Beginner Guide Button */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsGuideOpen(true)}
          className="w-8 h-8 rounded-full flex items-center justify-center bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-800/80 shadow-xs transition-colors shrink-0"
          title="新手快速上手指南 (交互式向导与常见场景)"
          aria-label="新手快速上手指南"
        >
          <HelpCircle className="w-4 h-4 shrink-0" />
        </motion.button>

        {/* Dynamic Sliding Theme Switcher */}
        <ThemeSlider />

        {/* Circular Refresh Button */}
        <motion.button
          whileTap={{ rotate: 180 }}
          onClick={onRefresh}
          disabled={isLoading}
          className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100/90 dark:bg-[#21262d] hover:bg-slate-200 dark:hover:bg-[#30363d] text-slate-600 dark:text-[#8b949e] transition-colors shadow-xs shrink-0"
          title="刷新提交记录"
        >
          <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-500' : ''}`} />
        </motion.button>
      </div>
    </header>

    {/* Git Operation Modals */}
    {activeRepo && (
      <>
        <CommitModal
          isOpen={isCommitModalOpen}
          repoId={activeRepo.id}
          onClose={() => setIsCommitModalOpen(false)}
          onSuccess={() => {
            onRefresh();
            fetchRepoStatus(activeRepo.id)
              .then(res => setPendingChangesCount(res.files.length))
              .catch(() => {});
          }}
        />

        <PublishGitHubModal
          isOpen={isGitHubModalOpen}
          repoId={activeRepo.id}
          repoName={activeRepo.name}
          onClose={() => setIsGitHubModalOpen(false)}
          onSuccess={onRefresh}
        />

        <CreateBranchTagModal
          isOpen={isBranchTagModalOpen}
          mode={branchTagModalMode}
          repoId={activeRepo.id}
          onClose={() => setIsBranchTagModalOpen(false)}
          onSuccess={onRefresh}
        />

        <CreatePrModal
          isOpen={isPrModalOpen}
          repoId={activeRepo.id}
          repoName={activeRepo.name}
          onClose={() => setIsPrModalOpen(false)}
          onOpenPublishModal={() => setIsGitHubModalOpen(true)}
        />

        <ConfirmActionModal
          isOpen={isUndoModalOpen}
          title="撤回最后一次提交"
          description="确定要撤回分支最新的提交吗？该操作会将 HEAD 指针回退一步 (git reset --soft HEAD~1)，提交中的所有修改将被完整保留在暂存区，您可以重新检查或重新提交。"
          badge="安全操作：改动完整保留在暂存区"
          confirmLabel="撤回提交"
          variant="warning"
          icon={<Undo2 className="w-6 h-6 text-amber-500" />}
          isLoading={isUndoing}
          onConfirm={handleConfirmUndoCommit}
          onCancel={() => setIsUndoModalOpen(false)}
        />

        <ConfirmActionModal
          isOpen={isDiscardModalOpen}
          title="放弃工作区所有修改"
          description="警告：确定要彻底放弃工作区所有未提交的代码变动吗？所有已追踪文件的修改将被复原，未跟踪的临时新文件将被清除 (git reset & checkout & clean)。"
          badge="高风险操作：工作区未提交改动不可找回"
          confirmLabel="彻底放弃所有修改"
          variant="danger"
          icon={<Trash2 className="w-6 h-6 text-rose-500" />}
          isLoading={isDiscarding}
          onConfirm={handleConfirmDiscardChanges}
          onCancel={() => setIsDiscardModalOpen(false)}
        />

        <InteractiveTour
          isOpen={isGuideOpen}
          onClose={() => setIsGuideOpen(false)}
        />

        <ConfirmActionModal
          isOpen={isDeleteBranchModalOpen}
          title={isForceDelete ? `强制删除分支 "${branchToDelete}"` : `删除本地分支 "${branchToDelete}"`}
          description={
            isForceDelete
              ? `警告：分支 "${branchToDelete}" 包含尚未合并到当前分支的代码改动。如果强制删除 (git branch -D)，这些提交将被彻底丢弃且无法找回。确定要强制删除吗？`
              : `确定要从本地仓库删除分支 "${branchToDelete}" 吗？该操作将删除该分支的指针 (git branch -d)。`
          }
          badge={isForceDelete ? "高风险警告：包含未合并提交" : "安全保护：若有未合并改动将被系统保护拒绝"}
          confirmLabel={isForceDelete ? "确定强制删除" : "确认删除分支"}
          variant="danger"
          icon={<Trash2 className="w-6 h-6 text-rose-500" />}
          isLoading={isDeletingBranch}
          onConfirm={handleConfirmDeleteBranch}
          onCancel={() => {
            setIsDeleteBranchModalOpen(false);
            setBranchToDelete(null);
            setIsForceDelete(false);
          }}
        />
      </>
    )}
  </>
);
};
