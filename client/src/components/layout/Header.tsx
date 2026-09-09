import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRepo } from '../../context/RepoContext';
import { useTheme } from '../../context/ThemeContext';
import { BranchItem, CommitFilterOptions } from '../../types';
import { 
  GitBranch, 
  Search, 
  Calendar, 
  FileCode, 
  RotateCw, 
  Sun, 
  Moon, 
  X,
  Check
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
  const [showPathFilter, setShowPathFilter] = useState(false);
  const [showDateFilter, setShowDateFilter] = useState(false);

  const activeBranch = filterOptions.branch || 'ALL';

  return (
    <header className="h-14 px-4 flex items-center justify-between border-b bg-white dark:bg-[#161b22] border-slate-200 dark:border-[#30363d] text-slate-800 dark:text-[#e6edf3] sticky top-0 z-30 select-none shadow-xs">
      {/* Left: Active Repo Info & Branch Selector */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold truncate">
              {activeRepo ? activeRepo.name : '未选择仓库'}
            </h1>
            {activeRepo && (
              <span
                className="text-[11px] text-slate-400 dark:text-[#8b949e] font-mono truncate max-w-[200px]"
                title={activeRepo.path}
              >
                {activeRepo.path}
              </span>
            )}
          </div>
        </div>

        {/* Branch Dropdown */}
        {activeRepo && (
          <div className="relative flex items-center">
            <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-slate-100 dark:bg-[#21262d] border border-slate-200 dark:border-[#30363d] hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
              <GitBranch className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <select
                value={activeBranch}
                onChange={e => onFilterChange({ branch: e.target.value, skip: 0 })}
                className="bg-transparent text-xs font-semibold cursor-pointer outline-none dark:text-slate-200 max-w-[150px] truncate"
              >
                <option value="ALL">全部分支 (--all)</option>
                <optgroup label="本地分支">
                  {branches
                    .filter(b => !b.isRemote)
                    .map(b => (
                      <option key={b.name} value={b.name}>
                        {b.current ? `${b.name} [HEAD]` : b.name}
                      </option>
                    ))}
                </optgroup>
                {branches.some(b => b.isRemote) && (
                  <optgroup label="远程分支">
                    {branches
                      .filter(b => b.isRemote)
                      .map(b => (
                        <option key={b.name} value={b.name}>
                          {b.name}
                        </option>
                      ))}
                  </optgroup>
                )}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Center/Right: Search, Filter, Theme */}
      <div className="flex items-center gap-2">
        {/* Search Bar */}
        <div className="relative w-48 lg:w-64">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
          <input
            type="text"
            placeholder="搜索提交信息、作者、SHA..."
            value={filterOptions.search || ''}
            onChange={e => onFilterChange({ search: e.target.value, skip: 0 })}
            className="w-full pl-8 pr-7 py-1 text-xs rounded-md bg-slate-100 dark:bg-[#0d1117] border border-slate-200 dark:border-[#30363d] focus:border-indigo-500 focus:outline-none dark:text-slate-200 placeholder-slate-400 transition-all focus:ring-1 focus:ring-indigo-500/20"
          />
          {filterOptions.search && (
            <button
              onClick={() => onFilterChange({ search: '', skip: 0 })}
              className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Date Filter Button & Dropdown */}
        <div className="relative">
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => {
              setShowDateFilter(!showDateFilter);
              setShowPathFilter(false);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md border transition-colors ${
              filterOptions.since
                ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400'
                : 'border-slate-200 dark:border-[#30363d] hover:bg-slate-100 dark:hover:bg-[#21262d] text-slate-600 dark:text-[#8b949e]'
            }`}
            title="时间范围筛选"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>
              {filterOptions.since ? '已设时间' : '日期范围'}
            </span>
          </motion.button>

          <AnimatePresence>
            {showDateFilter && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 w-48 p-2 rounded-xl bg-white dark:bg-[#161b22] border border-slate-200 dark:border-[#30363d] shadow-xl z-40 space-y-1 text-xs"
              >
                <div className="font-semibold text-slate-500 dark:text-slate-400 px-2 py-1 border-b border-slate-100 dark:border-[#30363d]">
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
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                        isSelected
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-medium'
                          : 'hover:bg-slate-100 dark:hover:bg-[#21262d] text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span>{item.label}</span>
                      {isSelected && <Check className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Path Filter Button & Dropdown */}
        <div className="relative">
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => {
              setShowPathFilter(!showPathFilter);
              setShowDateFilter(false);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md border transition-colors ${
              filterOptions.path
                ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400'
                : 'border-slate-200 dark:border-[#30363d] hover:bg-slate-100 dark:hover:bg-[#21262d] text-slate-600 dark:text-[#8b949e]'
            }`}
            title="按文件/目录反查历史"
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>
              {filterOptions.path ? filterOptions.path.substring(0, 10) + '...' : '文件路径'}
            </span>
          </motion.button>

          <AnimatePresence>
            {showPathFilter && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 w-72 p-3 rounded-xl bg-white dark:bg-[#161b22] border border-slate-200 dark:border-[#30363d] shadow-xl z-40 space-y-2.5 text-xs"
              >
                <div className="font-semibold text-slate-600 dark:text-slate-300">
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
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-slate-100 dark:bg-[#0d1117] border border-slate-200 dark:border-[#30363d] focus:border-indigo-500 focus:outline-none dark:text-slate-200 font-mono"
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

        {/* Refresh Button */}
        <motion.button
          whileTap={{ rotate: 180 }}
          onClick={onRefresh}
          disabled={isLoading}
          className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-[#21262d] text-slate-600 dark:text-[#8b949e] transition-colors"
          title="刷新提交记录"
        >
          <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-500' : ''}`} />
        </motion.button>

        {/* Theme Toggle */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={toggleTheme}
          className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-[#21262d] text-slate-600 dark:text-[#8b949e] transition-colors"
          title={theme === 'dark' ? '切换浅色模式' : '切换深色模式'}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </motion.button>
      </div>
    </header>
  );
};
