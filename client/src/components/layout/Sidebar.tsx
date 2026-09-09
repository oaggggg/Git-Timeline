import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRepo } from '../../context/RepoContext';
import { useToast } from '../../context/ToastContext';
import { 
  GitBranch, 
  FolderGit2, 
  Plus, 
  Search, 
  Star, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  Clock,
  FolderSearch
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface SidebarProps {
  onOpenAddModal: () => void;
  onOpenScanModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenAddModal, onOpenScanModal }) => {
  const { repositories, activeRepo, selectRepo, removeRepo, toggleStar } = useRepo();
  const { showToast } = useToast();
  const [collapsed, setCollapsed] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');

  const filteredRepos = repositories.filter(repo =>
    repo.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
    repo.path.toLowerCase().includes(filterQuery.toLowerCase())
  );

  const starredRepos = filteredRepos.filter(r => r.isStarred);
  const otherRepos = filteredRepos.filter(r => !r.isStarred);

  const handleToggleStar = (e: React.MouseEvent, id: string, name: string, isStarred?: boolean) => {
    e.stopPropagation();
    toggleStar(id);
    showToast(isStarred ? `已取消收藏 ${name}` : `已置顶收藏 ${name}`, 'info');
  };

  const handleRemoveRepo = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (confirm(`确定从列表中移除仓库 ${name} 吗？`)) {
      removeRepo(id);
      showToast(`已移除仓库 ${name}`, 'info');
    }
  };

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 280 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="h-screen flex flex-col border-r select-none z-20 bg-white dark:bg-[#161b22] border-slate-200/80 dark:border-[#30363d] text-slate-800 dark:text-[#e6edf3] shrink-0 shadow-xs"
    >
      {/* Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-slate-200/80 dark:border-[#30363d]">
        {!collapsed && (
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="p-2 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 shadow-xs">
              <FolderGit2 className="w-5 h-5" />
            </div>
            <span className="font-bold text-sm tracking-tight truncate">
              Git Timeline
            </span>
          </div>
        )}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? '展开工作区' : '折叠工作区'}
          className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-[#21262d] text-slate-500 dark:text-[#8b949e] transition-colors ml-auto"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </motion.button>
      </div>

      {/* Action Buttons */}
      {!collapsed && (
        <div className="p-3.5 border-b border-slate-200/80 dark:border-[#30363d] space-y-2.5">
          <div className="flex gap-2">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onOpenAddModal}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs hover:shadow-indigo-500/20 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              添加仓库
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onOpenScanModal}
              className="flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-2xl border border-slate-200 dark:border-[#30363d] hover:bg-slate-100 dark:hover:bg-[#21262d] transition-colors shadow-xs"
              title="扫描指定目录"
            >
              <FolderSearch className="w-3.5 h-3.5 text-indigo-500" />
              扫描
            </motion.button>
          </div>

          {/* Quick Search - Pill */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="快速过滤仓库..."
              value={filterQuery}
              onChange={e => setFilterQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-full bg-slate-100/90 dark:bg-[#0d1117] border border-slate-200/60 dark:border-transparent focus:border-indigo-500 focus:bg-white dark:focus:bg-[#0d1117] focus:outline-none dark:text-slate-200 placeholder-slate-400 transition-all"
            />
          </div>
        </div>
      )}

      {/* Repository List */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-4">
        {collapsed ? (
          <div className="flex flex-col items-center gap-2.5">
            {repositories.map(repo => {
              const isActive = activeRepo?.id === repo.id;
              return (
                <motion.button
                  key={repo.id}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => selectRepo(repo.id)}
                  title={`${repo.name}\n${repo.path}`}
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/30'
                      : 'hover:bg-slate-100 dark:hover:bg-[#21262d] text-slate-600 dark:text-[#8b949e]'
                  }`}
                >
                  {repo.name.substring(0, 2).toUpperCase()}
                </motion.button>
              );
            })}
          </div>
        ) : (
          <AnimatePresence>
            {/* Starred */}
            {starredRepos.length > 0 && (
              <div>
                <div className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-[#8b949e]">
                  置顶收藏 ({starredRepos.length})
                </div>
                <div className="space-y-1.5">
                  {starredRepos.map(repo => renderRepoItem(repo))}
                </div>
              </div>
            )}

            {/* Other */}
            <div>
              {starredRepos.length > 0 && (
                <div className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-[#8b949e]">
                  全部仓库 ({otherRepos.length})
                </div>
              )}
              {otherRepos.length === 0 && starredRepos.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 dark:text-[#8b949e] leading-relaxed">
                  暂无匹配仓库，请点击上方“添加仓库”或“扫描”
                </div>
              ) : (
                <div className="space-y-1.5">
                  {otherRepos.map(repo => renderRepoItem(repo))}
                </div>
              )}
            </div>
          </AnimatePresence>
        )}
      </div>
    </motion.aside>
  );

  function renderRepoItem(repo: typeof repositories[0]) {
    const isActive = activeRepo?.id === repo.id;

    return (
      <motion.div
        key={repo.id}
        layout
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -10 }}
        transition={{ duration: 0.15 }}
        onClick={() => selectRepo(repo.id)}
        className={`group relative flex items-start gap-3 p-2.5 rounded-2xl cursor-pointer transition-all ${
          isActive
            ? 'bg-indigo-50/90 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200 font-medium ring-1 ring-indigo-500/20 shadow-xs'
            : 'hover:bg-slate-100/80 dark:hover:bg-[#21262d]/70 text-slate-700 dark:text-[#c9d1d9]'
        }`}
      >
        <div
          className={`mt-0.5 p-1.5 rounded-xl transition-colors ${
            isActive
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-slate-200/70 dark:bg-[#30363d] text-slate-600 dark:text-slate-300'
          }`}
        >
          <FolderGit2 className="w-3.5 h-3.5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-semibold truncate" title={repo.name}>
              {repo.name}
            </span>
            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
              <motion.button
                whileTap={{ scale: 1.3 }}
                onClick={e => handleToggleStar(e, repo.id, repo.name, repo.isStarred)}
                title={repo.isStarred ? '取消收藏' : '置顶收藏'}
                className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-slate-200/60 dark:hover:bg-[#30363d]"
              >
                <Star
                  className={`w-3 h-3 ${
                    repo.isStarred ? 'fill-amber-400 text-amber-400' : 'text-slate-400'
                  }`}
                />
              </motion.button>
              <button
                onClick={e => handleRemoveRepo(e, repo.id, repo.name)}
                title="移除"
                className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-rose-100 dark:hover:bg-rose-950/50 text-slate-400 hover:text-rose-500"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 dark:text-[#8b949e]">
            <span className="flex items-center gap-1 truncate max-w-[110px] font-medium">
              <GitBranch className="w-3 h-3 shrink-0 text-indigo-500" />
              <span className="truncate">{repo.currentBranch}</span>
            </span>
            {repo.lastCommitDate && (
              <span className="flex items-center gap-0.5 shrink-0 text-[10px] text-slate-400">
                <Clock className="w-2.5 h-2.5" />
                {formatDistanceToNow(new Date(repo.lastCommitDate), {
                  addSuffix: true,
                  locale: zhCN
                })}
              </span>
            )}
          </div>
        </div>
      </motion.div>
    );
  }
};
