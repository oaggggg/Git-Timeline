import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRepo } from '../../context/RepoContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { BranchItem, CommitFilterOptions } from '../../types';
import { gitPull, gitPush, gitStash, fetchRepoStatus } from '../../services/api';
import { CommitModal } from '../modals/CommitModal';
import { PublishGitHubModal } from '../modals/PublishGitHubModal';
import { CreateBranchTagModal } from '../modals/CreateBranchTagModal';
import { 
  GitBranch, 
  GitCommit,
  ArrowDownToLine,
  ArrowUpFromLine,
  Globe,
  Tag,
  Archive,
  ArchiveRestore,
  MoreHorizontal,
  Search, 
  Calendar, 
  FileCode, 
  RotateCw, 
  Sun, 
  Moon, 
  X, 
  Check, 
  ChevronDown 
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
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const [showBranchMenu, setShowBranchMenu] = useState(false);
  const [showPathFilter, setShowPathFilter] = useState(false);
  const [showDateFilter, setShowDateFilter] = useState(false);

  // Git Visual Actions State
  const [isCommitModalOpen, setIsCommitModalOpen] = useState(false);
  const [isGitHubModalOpen, setIsGitHubModalOpen] = useState(false);
  const [isBranchTagModalOpen, setIsBranchTagModalOpen] = useState(false);
  const [branchTagModalMode, setBranchTagModalMode] = useState<'branch' | 'tag'>('branch');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [pendingChangesCount, setPendingChangesCount] = useState<number>(0);

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
    showToast('正在拉取远程分支更新 (git pull)...', 'info');
    try {
      const res = await gitPull(activeRepo.id);
      showToast(res.output?.trim() || '已成功拉取最新代码', 'success');
      onRefresh();
    } catch (err: any) {
      showToast(err.message || '拉取失败，请检查远程分支配置或冲突', 'error');
    } finally {
      setIsPulling(false);
    }
  };

  const handlePush = async () => {
    if (!activeRepo || isPushing) return;
    setIsPushing(true);
    showToast('正在推送到远程 (git push)...', 'info');
    try {
      const res = await gitPush(activeRepo.id);
      showToast(res.output?.trim() || '已成功推送到远程', 'success');
      onRefresh();
    } catch (err: any) {
      showToast(err.message || '推送失败，可尝试使用“发布到 GitHub”关联远程分支', 'error');
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

  const activeBranch = filterOptions.branch || 'ALL';

  return (
    <>
      <header className="h-16 px-6 flex items-center justify-between border-b bg-white/80 dark:bg-[#161b22]/80 backdrop-blur-md border-slate-200/80 dark:border-[#30363d] text-slate-800 dark:text-[#e6edf3] sticky top-0 z-30 select-none shadow-xs">
      {/* Left: Active Repo Info & Branch Selector */}
      <div className="flex items-center gap-3.5 min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="text-sm font-bold truncate tracking-tight">
              {activeRepo ? activeRepo.name : '未选择仓库'}
            </h1>
            {activeRepo && (
              <span
                className="text-[11px] text-slate-400 dark:text-[#8b949e] font-mono truncate max-w-[200px] px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-[#21262d]"
                title={activeRepo.path}
              >
                {activeRepo.path}
              </span>
            )}
          </div>
        </div>

        {/* Custom Rounded Pill Branch Selector */}
        {activeRepo && (
          <div className="relative">
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => {
                setShowBranchMenu(!showBranchMenu);
                setShowDateFilter(false);
                setShowPathFilter(false);
              }}
              className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-full bg-slate-100/90 dark:bg-[#21262d] border border-slate-200 dark:border-[#30363d] hover:border-slate-300 dark:hover:border-slate-500 transition-colors shadow-xs"
            >
              <GitBranch className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span className="truncate max-w-[130px]">
                {activeBranch === 'ALL' ? '全部分支 (--all)' : activeBranch}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showBranchMenu ? 'rotate-180' : ''}`} />
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
                    分支切换
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
                    {activeBranch === 'ALL' && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
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
                          <div className="flex items-center gap-2 truncate">
                            <span className="truncate">{b.name}</span>
                            {b.current && (
                              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                                HEAD
                              </span>
                            )}
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />}
                        </button>
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
          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200/80 dark:border-[#30363d]">
            {/* Manual Commit Button */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsCommitModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-all"
              title="手动提交代码变动"
            >
              <GitCommit className="w-3.5 h-3.5" />
              <span>提交代码</span>
              {pendingChangesCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-white/25 text-[10px] flex items-center justify-center font-bold">
                  {pendingChangesCount}
                </span>
              )}
            </motion.button>

            {/* Pull Button */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handlePull}
              disabled={isPulling}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-full bg-slate-100 dark:bg-[#21262d] hover:bg-slate-200 dark:hover:bg-[#30363d] text-slate-700 dark:text-slate-200 transition-colors shadow-xs"
              title="拉取远程更新 (git pull)"
            >
              <ArrowDownToLine className={`w-3.5 h-3.5 text-indigo-500 ${isPulling ? 'animate-bounce' : ''}`} />
              <span className="hidden sm:inline">{isPulling ? '拉取中...' : '拉取'}</span>
            </motion.button>

            {/* Push Button */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handlePush}
              disabled={isPushing}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-full bg-slate-100 dark:bg-[#21262d] hover:bg-slate-200 dark:hover:bg-[#30363d] text-slate-700 dark:text-slate-200 transition-colors shadow-xs"
              title="推送到远程 (git push)"
            >
              <ArrowUpFromLine className={`w-3.5 h-3.5 text-indigo-500 ${isPushing ? 'animate-bounce' : ''}`} />
              <span className="hidden sm:inline">{isPushing ? '推送中...' : '推送'}</span>
            </motion.button>

            {/* Publish to GitHub Button */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsGitHubModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full bg-slate-100 dark:bg-[#21262d] hover:bg-slate-200 dark:hover:bg-[#30363d] text-slate-700 dark:text-slate-200 transition-colors shadow-xs"
              title="发布或同步到 GitHub"
            >
              <Globe className="w-3.5 h-3.5 text-emerald-500" />
              <span className="hidden md:inline">发布到 GitHub</span>
            </motion.button>

            {/* More Git Actions Menu */}
            <div className="relative">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className="w-7 h-7 rounded-full flex items-center justify-center bg-slate-100 dark:bg-[#21262d] hover:bg-slate-200 dark:hover:bg-[#30363d] text-slate-600 dark:text-slate-300 transition-colors shadow-xs"
                title="更多 Git 操作"
              >
                <MoreHorizontal className="w-4 h-4" />
              </motion.button>

              <AnimatePresence>
                {showMoreMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 mt-2 w-44 p-1.5 rounded-2xl bg-white dark:bg-[#161b22] border border-slate-200 dark:border-[#30363d] shadow-2xl z-40 space-y-1 text-xs"
                  >
                    <button
                      onClick={() => {
                        setShowMoreMenu(false);
                        setBranchTagModalMode('branch');
                        setIsBranchTagModalOpen(true);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-left hover:bg-slate-100 dark:hover:bg-[#21262d] text-slate-700 dark:text-slate-200 transition-colors"
                    >
                      <GitBranch className="w-3.5 h-3.5 text-indigo-500" />
                      <span>新建分支</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowMoreMenu(false);
                        setBranchTagModalMode('tag');
                        setIsBranchTagModalOpen(true);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-left hover:bg-slate-100 dark:hover:bg-[#21262d] text-slate-700 dark:text-slate-200 transition-colors"
                    >
                      <Tag className="w-3.5 h-3.5 text-emerald-500" />
                      <span>打版本标签 (Tag)</span>
                    </button>
                    <div className="border-t border-slate-100 dark:border-[#30363d] my-1" />
                    <button
                      onClick={() => handleStash('stash')}
                      className="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-left hover:bg-slate-100 dark:hover:bg-[#21262d] text-slate-700 dark:text-slate-200 transition-colors"
                    >
                      <Archive className="w-3.5 h-3.5 text-amber-500" />
                      <span>暂存工作区 (Stash)</span>
                    </button>
                    <button
                      onClick={() => handleStash('pop')}
                      className="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-left hover:bg-slate-100 dark:hover:bg-[#21262d] text-slate-700 dark:text-slate-200 transition-colors"
                    >
                      <ArchiveRestore className="w-3.5 h-3.5 text-amber-500" />
                      <span>恢复暂存 (Stash Pop)</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>

      {/* Center/Right: Search, Filter, Theme */}
      <div className="flex items-center gap-2.5">
        {/* Rounded Pill Search Bar */}
        <div className="relative w-48 lg:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="搜索提交、作者、SHA..."
            value={filterOptions.search || ''}
            onChange={e => onFilterChange({ search: e.target.value, skip: 0 })}
            className="w-full pl-9 pr-8 py-1.5 text-xs rounded-full bg-slate-100/90 dark:bg-[#0d1117] border border-slate-200/80 dark:border-[#30363d] focus:border-indigo-500 focus:bg-white dark:focus:bg-[#0d1117] focus:outline-none dark:text-slate-200 placeholder-slate-400 transition-all focus:ring-2 focus:ring-indigo-500/15"
          />
          {filterOptions.search && (
            <button
              onClick={() => onFilterChange({ search: '', skip: 0 })}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Rounded Pill Date Filter Button */}
        <div className="relative">
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => {
              setShowDateFilter(!showDateFilter);
              setShowPathFilter(false);
              setShowBranchMenu(false);
            }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-full border transition-colors shadow-xs ${
              filterOptions.since
                ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400'
                : 'border-slate-200 dark:border-[#30363d] hover:bg-slate-100 dark:hover:bg-[#21262d] text-slate-600 dark:text-[#8b949e]'
            }`}
            title="时间范围筛选"
          >
            <Calendar className="w-3.5 h-3.5 text-indigo-500" />
            <span>
              {filterOptions.since ? '已设时间' : '日期范围'}
            </span>
          </motion.button>

          <AnimatePresence>
            {showDateFilter && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 w-48 p-2 rounded-2xl bg-white dark:bg-[#161b22] border border-slate-200 dark:border-[#30363d] shadow-2xl z-40 space-y-1 text-xs"
              >
                <div className="font-semibold text-slate-500 dark:text-slate-400 px-2.5 py-1 border-b border-slate-100 dark:border-[#30363d]">
                  快速日期筛选
                </div>
                {[
                  { label: '全部历史 (不限)', value: undefined },
                  { label: '最近 7 天', value: '7 days ago' },
                  { label: '最近 30 天', value: '30 days ago' },
                  { label: '最近 90 天', value: '90 days ago' }
                ].map(item => {
                  const isSelected = filterOptions.since === item.value;
                  return (
                    <button
                      key={item.label}
                      onClick={() => {
                        onFilterChange({ since: item.value, until: undefined, skip: 0 });
                        setShowDateFilter(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-left transition-colors ${
                        isSelected
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold'
                          : 'hover:bg-slate-100 dark:hover:bg-[#21262d] text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span>{item.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Rounded Pill Path Filter Button */}
        <div className="relative">
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => {
              setShowPathFilter(!showPathFilter);
              setShowDateFilter(false);
              setShowBranchMenu(false);
            }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-full border transition-colors shadow-xs ${
              filterOptions.path
                ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400'
                : 'border-slate-200 dark:border-[#30363d] hover:bg-slate-100 dark:hover:bg-[#21262d] text-slate-600 dark:text-[#8b949e]'
            }`}
            title="按文件/目录反查历史"
          >
            <FileCode className="w-3.5 h-3.5 text-indigo-500" />
            <span>
              {filterOptions.path ? filterOptions.path.substring(0, 10) + '...' : '文件路径'}
            </span>
          </motion.button>

          <AnimatePresence>
            {showPathFilter && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 w-72 p-3.5 rounded-2xl bg-white dark:bg-[#161b22] border border-slate-200 dark:border-[#30363d] shadow-2xl z-40 space-y-2.5 text-xs"
              >
                <div className="font-semibold text-slate-700 dark:text-slate-200">
                  限定文件或目录路径
                </div>
                <input
                  type="text"
                  placeholder="例如: src/ 或 README.md"
                  defaultValue={filterOptions.path || ''}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      onFilterChange({ path: (e.target as HTMLInputElement).value.trim(), skip: 0 });
                      setShowPathFilter(false);
                    }
                  }}
                  className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-100 dark:bg-[#0d1117] border border-slate-200 dark:border-[#30363d] focus:border-indigo-500 focus:outline-none dark:text-slate-200 font-mono"
                />
                <div className="flex justify-between items-center text-[11px] text-slate-400">
                  <span>按回车确认筛选</span>
                  {filterOptions.path && (
                    <button
                      onClick={() => {
                        onFilterChange({ path: undefined, skip: 0 });
                        setShowPathFilter(false);
                      }}
                      className="text-rose-500 hover:underline"
                    >
                      清除条件
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Circular Action Buttons */}
        <motion.button
          whileTap={{ rotate: 180 }}
          onClick={onRefresh}
          disabled={isLoading}
          className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100/90 dark:bg-[#21262d] hover:bg-slate-200 dark:hover:bg-[#30363d] text-slate-600 dark:text-[#8b949e] transition-colors shadow-xs"
          title="刷新提交记录"
        >
          <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-500' : ''}`} />
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={toggleTheme}
          className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100/90 dark:bg-[#21262d] hover:bg-slate-200 dark:hover:bg-[#30363d] text-slate-600 dark:text-[#8b949e] transition-colors shadow-xs"
          title={theme === 'dark' ? '切换浅色模式' : '切换深色模式'}
        >
          {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-600" />}
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
      </>
    )}
  </>
);
};
