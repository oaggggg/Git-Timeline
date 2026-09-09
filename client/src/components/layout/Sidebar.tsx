import React, { useState } from 'react';
import { useRepo } from '../../context/RepoContext';
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
  Sparkles
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface SidebarProps {
  onOpenAddModal: () => void;
  onOpenScanModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenAddModal, onOpenScanModal }) => {
  const { repositories, activeRepo, selectRepo, removeRepo, toggleStar } = useRepo();
  const [collapsed, setCollapsed] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');

  const filteredRepos = repositories.filter(repo =>
    repo.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
    repo.path.toLowerCase().includes(filterQuery.toLowerCase())
  );

  const starredRepos = filteredRepos.filter(r => r.isStarred);
  const otherRepos = filteredRepos.filter(r => !r.isStarred);

  return (
    <aside
      className={`h-screen flex flex-col border-r transition-all duration-300 select-none z-20 ${
        collapsed ? 'w-16' : 'w-72'
      } bg-white dark:bg-[#161b22] border-slate-200 dark:border-[#30363d] text-slate-800 dark:text-[#e6edf3]`}
    >
      {/* Header */}
      <div className="h-14 px-3 flex items-center justify-between border-b border-slate-200 dark:border-[#30363d]">
        {!collapsed && (
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
              <FolderGit2 className="w-5 h-5" />
            </div>
            <span className="font-semibold text-sm tracking-tight truncate">
              Git Timeline
            </span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? '展开侧边栏' : '折叠侧边栏'}
          className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-[#21262d] text-slate-500 dark:text-[#8b949e] transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Action Buttons */}
      {!collapsed && (
        <div className="p-3 border-b border-slate-200 dark:border-[#30363d] space-y-2">
          <div className="flex gap-1.5">
            <button
              onClick={onOpenAddModal}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 text-xs font-medium rounded-md bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              添加仓库
            </button>
            <button
              onClick={onOpenScanModal}
              className="flex items-center justify-center gap-1.5 py-1.5 px-2.5 text-xs font-medium rounded-md border border-slate-200 dark:border-[#30363d] hover:bg-slate-100 dark:hover:bg-[#21262d] transition-colors"
              title="扫描指定父目录"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              扫描
            </button>
          </div>

          {/* Quick Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
            <input
              type="text"
              placeholder="搜索仓库..."
              value={filterQuery}
              onChange={e => setFilterQuery(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1 text-xs rounded-md bg-slate-100 dark:bg-[#0d1117] border border-transparent focus:border-indigo-500 focus:outline-none dark:text-slate-200 placeholder-slate-400"
            />
          </div>
        </div>
      )}

      {/* Repository List */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-4">
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            {repositories.map(repo => {
              const isActive = activeRepo?.id === repo.id;
              return (
                <button
                  key={repo.id}
                  onClick={() => selectRepo(repo.id)}
                  title={`${repo.name}\n${repo.path}`}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold transition-colors ${
                    isActive
                      ? 'bg-indigo-600 text-white'
                      : 'hover:bg-slate-100 dark:hover:bg-[#21262d] text-slate-600 dark:text-[#8b949e]'
                  }`}
                >
                  {repo.name.substring(0, 2).toUpperCase()}
                </button>
              );
            })}
          </div>
        ) : (
          <>
            {/* Starred */}
            {starredRepos.length > 0 && (
              <div>
                <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-[#8b949e]">
                  置顶收藏 ({starredRepos.length})
                </div>
                <div className="space-y-1">
                  {starredRepos.map(repo => renderRepoItem(repo))}
                </div>
              </div>
            )}

            {/* Other */}
            <div>
              {starredRepos.length > 0 && (
                <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-[#8b949e]">
                  全部仓库 ({otherRepos.length})
                </div>
              )}
              {otherRepos.length === 0 && starredRepos.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400 dark:text-[#8b949e]">
                  暂无匹配仓库，请点击上方“添加仓库”或“扫描”
                </div>
              ) : (
                <div className="space-y-1">
                  {otherRepos.map(repo => renderRepoItem(repo))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </aside>
  );

  function renderRepoItem(repo: typeof repositories[0]) {
    const isActive = activeRepo?.id === repo.id;

    return (
      <div
        key={repo.id}
        onClick={() => selectRepo(repo.id)}
        className={`group relative flex items-start gap-2.5 p-2 rounded-lg cursor-pointer transition-colors ${
          isActive
            ? 'bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200 font-medium'
            : 'hover:bg-slate-100/80 dark:hover:bg-[#21262d]/70 text-slate-700 dark:text-[#c9d1d9]'
        }`}
      >
        <div
          className={`mt-0.5 p-1 rounded ${
            isActive
              ? 'bg-indigo-600 text-white'
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
            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
              <button
                onClick={e => {
                  e.stopPropagation();
                  toggleStar(repo.id);
                }}
                title={repo.isStarred ? '取消收藏' : '置顶收藏'}
                className="p-1 hover:text-amber-500 rounded"
              >
                <Star
                  className={`w-3 h-3 ${
                    repo.isStarred ? 'fill-amber-400 text-amber-400' : 'text-slate-400'
                  }`}
                />
              </button>
              <button
                onClick={e => {
                  e.stopPropagation();
                  if (confirm(`确定从列表中移除仓库 ${repo.name} 吗？`)) {
                    removeRepo(repo.id);
                  }
                }}
                title="移除"
                className="p-1 hover:text-rose-500 rounded"
              >
                <Trash2 className="w-3 h-3 text-slate-400 hover:text-rose-500" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 dark:text-[#8b949e]">
            <span className="flex items-center gap-1 truncate max-w-[120px]">
              <GitBranch className="w-3 h-3 shrink-0" />
              <span className="truncate">{repo.currentBranch}</span>
            </span>
            {repo.lastCommitDate && (
              <span className="flex items-center gap-0.5 shrink-0 text-[10px]">
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
