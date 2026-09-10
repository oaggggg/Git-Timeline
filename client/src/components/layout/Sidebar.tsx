import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useRepo } from '../../context/RepoContext';
import { useToast } from '../../context/ToastContext';
import { ConfirmDeleteModal } from '../modals/ConfirmDeleteModal';
import { 
  GitBranch, 
  FolderGit2, 
  FolderOpen,
  Search, 
  Star, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  Clock,
  Loader2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface SidebarProps {
  onOpenRepo: () => void;
  isOpeningRepo?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenRepo, isOpeningRepo = false }) => {
  const { repositories, activeRepo, selectRepo, removeRepo, toggleStar } = useRepo();
  const { showToast } = useToast();
  const [collapsed, setCollapsed] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');
  const [repoToDelete, setRepoToDelete] = useState<{ id: string; name: string } | null>(null);

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

  const handleRequestRemove = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    setRepoToDelete({ id, name });
  };

  const handleConfirmRemove = () => {
    if (repoToDelete) {
      removeRepo(repoToDelete.id);
      showToast(`已移除仓库 ${repoToDelete.name}`, 'info');
      setRepoToDelete(null);
    }
  };

  return (
    <>
      <aside
        className={`h-screen flex flex-col border-r select-none z-20 bg-white dark:bg-[#161b22] border-slate-200/80 dark:border-[#30363d] text-slate-800 dark:text-[#e6edf3] shrink-0 shadow-xs overflow-hidden transition-[width] duration-300 ease-[cubic-bezier(0.2,0,0,1)] will-change-[width] ${
          collapsed ? 'w-16' : 'w-[280px]'
        }`}
      >
        {/* Header */}
        <div
          className={`h-16 flex items-center border-b border-slate-200/80 dark:border-[#30363d] overflow-hidden whitespace-nowrap transition-all duration-300 ${
            collapsed ? 'justify-center px-0' : 'justify-between px-3.5'
          }`}
        >
          {!collapsed && (
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="p-2 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 shadow-xs shrink-0">
                <FolderGit2 className="w-5 h-5" />
              </div>
              <span className="font-bold text-sm tracking-tight truncate whitespace-nowrap">
                Git Timeline
              </span>
            </div>
          )}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              if (!collapsed) {
                setFilterQuery('');
              }
              setCollapsed(!collapsed);
            }}
            title={collapsed ? '展开工作区' : '折叠工作区'}
            className="p-2 rounded-2xl hover:bg-slate-100 dark:hover:bg-[#21262d] text-slate-500 dark:text-[#8b949e] transition-colors shrink-0"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </motion.button>
        </div>

        {/* Action Button: Open Repo */}
        <div className="p-3 border-b border-slate-200/80 dark:border-[#30363d] space-y-2 overflow-hidden">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={onOpenRepo}
            disabled={isOpeningRepo}
            title={collapsed ? (isOpeningRepo ? '正在选择文件夹...' : '打开仓库') : undefined}
            className={`flex items-center justify-center gap-2 text-xs font-semibold rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-75 text-white shadow-xs hover:shadow-indigo-500/20 transition-all duration-200 ${
              collapsed ? 'w-10 h-10 mx-auto p-0' : 'w-full py-2.5 px-3'
            }`}
          >
            {isOpeningRepo ? (
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            ) : (
              <FolderOpen className="w-4 h-4 shrink-0" />
            )}
            {!collapsed && (
              <span className="whitespace-nowrap truncate">
                {isOpeningRepo ? '请在系统窗口中选择...' : '打开仓库'}
              </span>
            )}
          </motion.button>

          {/* Search Filter Box */}
          <div
            className={`transition-all duration-300 overflow-hidden ${
              collapsed ? 'max-h-0 opacity-0 pointer-events-none' : 'max-h-12 opacity-100'
            }`}
          >
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none shrink-0" />
              <input
                type="text"
                placeholder="快速过滤仓库..."
                value={filterQuery}
                onChange={e => setFilterQuery(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Escape') {
                    setFilterQuery('');
                    (e.target as HTMLInputElement).blur();
                  } else if (e.key === 'Enter') {
                    const firstMatch = [...starredRepos, ...otherRepos][0];
                    if (firstMatch) {
                      selectRepo(firstMatch.id);
                      setFilterQuery('');
                      (e.target as HTMLInputElement).blur();
                    }
                  }
                }}
                onBlur={() => {
                  setTimeout(() => {
                    setFilterQuery('');
                  }, 200);
                }}
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-full bg-slate-100/90 dark:bg-[#0d1117] border border-slate-200/80 dark:border-[#30363d] focus:border-indigo-500 dark:focus:border-indigo-500 focus:bg-white dark:focus:bg-[#0d1117] focus:outline-none outline-none focus:ring-0 ring-0 shadow-none text-slate-800 dark:text-slate-200 placeholder-slate-400 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Repository List */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-2.5 space-y-4">
          {/* Starred */}
          {starredRepos.length > 0 && (
            <div>
              {!collapsed && (
                <div className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-[#8b949e]">
                  置顶收藏 ({starredRepos.length})
                </div>
              )}
              <div className="space-y-1.5">
                {starredRepos.map(repo => renderRepoItem(repo))}
              </div>
            </div>
          )}

          {/* Other */}
          <div>
            {!collapsed && starredRepos.length > 0 && (
              <div className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-[#8b949e]">
                全部仓库 ({otherRepos.length})
              </div>
            )}
            {otherRepos.length === 0 && starredRepos.length === 0 ? (
              !collapsed && (
                <div className="p-6 text-center text-xs text-slate-400 dark:text-[#8b949e] leading-relaxed">
                  暂无匹配仓库，请点击上方“打开仓库”
                </div>
              )
            ) : (
              <div className="space-y-1.5">
                {otherRepos.map(repo => renderRepoItem(repo))}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Modern Confirm Delete Modal replacing window.confirm */}
      <ConfirmDeleteModal
        isOpen={!!repoToDelete}
        repoName={repoToDelete?.name || ''}
        onConfirm={handleConfirmRemove}
        onCancel={() => setRepoToDelete(null)}
      />
    </>
  );

  function renderRepoItem(repo: typeof repositories[0]) {
    const isActive = activeRepo?.id === repo.id;

    if (collapsed) {
      return (
        <div
          key={repo.id}
          onClick={() => selectRepo(repo.id)}
          title={`${repo.name}\n${repo.path}`}
          className={`w-10 h-10 mx-auto flex items-center justify-center rounded-2xl cursor-pointer text-xs font-bold transition-all ${
            isActive
              ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/30'
              : 'bg-slate-100/90 dark:bg-[#21262d] text-slate-600 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-[#30363d]'
          }`}
        >
          {repo.name.substring(0, 2).toUpperCase()}
        </div>
      );
    }

    return (
      <div
        key={repo.id}
        onClick={() => {
          selectRepo(repo.id);
          setFilterQuery('');
        }}
        title={`${repo.name}\n${repo.path}`}
        className={`group relative flex items-center rounded-2xl cursor-pointer transition-all p-2.5 gap-3 ${
          isActive
            ? 'bg-indigo-50/90 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200 font-medium ring-1 ring-indigo-500/20 shadow-xs'
            : 'hover:bg-slate-100/80 dark:hover:bg-[#21262d]/70 text-slate-700 dark:text-[#c9d1d9]'
        }`}
      >
        <div
          className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-[11px] font-bold transition-colors ${
            isActive
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-slate-200/70 dark:bg-[#30363d] text-slate-600 dark:text-slate-300'
          }`}
        >
          {repo.name.substring(0, 2).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0 overflow-hidden">
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
                onClick={e => handleRequestRemove(e, repo.id, repo.name)}
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
      </div>
    );
  }
};
