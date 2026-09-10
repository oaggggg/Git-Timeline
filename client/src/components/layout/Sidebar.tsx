import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useRepo } from '../../context/RepoContext';
import { useToast } from '../../context/ToastContext';
import { ConfirmDeleteModal } from '../modals/ConfirmDeleteModal';
import {
  GitBranch, FolderGit2, FolderOpen, Search, Star, Trash2,
  ChevronLeft, Clock, Loader2, Users
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { AuthorItem } from '../../types';
import { AuthorAvatar } from '../common/AuthorAvatar';
import './Sidebar.css';

interface SidebarProps {
  onOpenRepo: () => void;
  isOpeningRepo?: boolean;
  authors?: AuthorItem[];
  selectedAuthor?: string;
  onSelectAuthor?: (authorName?: string) => void;
  isLoadingAuthors?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = React.memo(({
  onOpenRepo,
  isOpeningRepo = false,
  authors = [],
  selectedAuthor,
  onSelectAuthor,
  isLoadingAuthors = false
}) => {
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
  const totalCommits = authors.reduce((sum, a) => sum + a.commitsCount, 0);

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
        aria-label="仓库侧边栏"
        data-collapsed={collapsed}
        className="repo-sidebar h-screen flex flex-col border-r select-none z-20 bg-white dark:bg-[#161b22] border-slate-200/80 dark:border-[#30363d] text-slate-800 dark:text-[#e6edf3] shrink-0 shadow-xs overflow-hidden"
      >
        <div className="relative h-16 flex items-center border-b border-slate-200/80 dark:border-[#30363d] shrink-0 overflow-hidden">
          <div className="sidebar-brand sidebar-detail flex items-center gap-2.5" aria-hidden={collapsed}>
            <div className="w-9 h-9 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <FolderGit2 className="w-5 h-5" />
            </div>
            <span className="font-bold text-sm whitespace-nowrap">Git Timeline</span>
          </div>
          <button
            type="button"
            onClick={() => {
              if (!collapsed) setFilterQuery('');
              setCollapsed(value => !value);
            }}
            title={collapsed ? '展开侧边栏' : '折叠侧边栏'}
            aria-label={collapsed ? '展开侧边栏' : '折叠侧边栏'}
            aria-expanded={!collapsed}
            aria-controls="sidebar-content"
            className="sidebar-toggle absolute right-[13px] w-10 h-10 flex items-center justify-center rounded-2xl hover:bg-slate-100 dark:hover:bg-[#21262d] text-slate-500 dark:text-[#8b949e] hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        <div id="sidebar-content" className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="sidebar-actions border-b border-slate-200/80 dark:border-[#30363d] shrink-0">
            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={onOpenRepo}
              disabled={isOpeningRepo}
              title={isOpeningRepo ? '正在选择文件夹...' : '打开仓库'}
              aria-label={isOpeningRepo ? '正在选择文件夹...' : '打开仓库'}
              className="sidebar-open w-full h-10 flex items-center rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-75 text-white shadow-xs transition-colors overflow-hidden cursor-pointer"
            >
              <span className="sidebar-icon">
                {isOpeningRepo ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderOpen className="w-4 h-4" />}
              </span>
              <span className="sidebar-detail whitespace-nowrap text-xs font-semibold" aria-hidden={collapsed}>
                {isOpeningRepo ? '选择中...' : '打开仓库'}
              </span>
            </motion.button>
            <div className="sidebar-fold" inert={collapsed} aria-hidden={collapsed}>
              <div>
                <div className="sidebar-search relative mt-2.5">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    aria-label="过滤仓库"
                    placeholder="快速过滤仓库..."
                    value={filterQuery}
                    onChange={e => setFilterQuery(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Escape') {
                        setFilterQuery('');
                        e.currentTarget.blur();
                      } else if (e.key === 'Enter') {
                        const firstMatch = [...starredRepos, ...otherRepos][0];
                        if (firstMatch) {
                          selectRepo(firstMatch.id);
                          setFilterQuery('');
                          e.currentTarget.blur();
                        }
                      }
                    }}
                    onBlur={() => setTimeout(() => setFilterQuery(''), 200)}
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck="false"
                    className="w-full h-8 pl-8 pr-3 text-xs rounded-full bg-slate-100/90 dark:bg-[#0d1117] border border-slate-200/80 dark:border-[#30363d] focus:border-indigo-500 focus:outline-none text-slate-800 dark:text-slate-200 placeholder-slate-400"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="sidebar-repositories flex-1 min-h-0 overflow-y-auto overflow-x-hidden py-2 space-y-3">
            {starredRepos.length > 0 && (
              <div>
                {renderGroupHeading(`置顶收藏 (${starredRepos.length})`)}
                <div className="space-y-1.5">{starredRepos.map(renderRepoItem)}</div>
              </div>
            )}
            <div>
              {renderGroupHeading(starredRepos.length > 0 ? `其他仓库 (${otherRepos.length})` : `本地仓库 (${otherRepos.length})`)}
              {otherRepos.length === 0 && starredRepos.length === 0 ? (
                <div className="sidebar-fold" aria-hidden={collapsed}>
                  <div>
                    <div className="sidebar-empty p-6 text-center text-xs text-slate-400 leading-relaxed">
                      暂无匹配仓库，请点击上方“打开仓库”
                    </div>
                  </div>
                </div>
              ) : <div className="space-y-1.5">{otherRepos.map(renderRepoItem)}</div>}
            </div>
          </div>

          <section aria-label="代码贡献者" className="sidebar-contributors shrink-0 border-t border-slate-200/80 dark:border-[#30363d] bg-slate-50/70 dark:bg-[#11161d] flex flex-col">
            <div className="sidebar-author-heading flex items-center h-12 shrink-0 overflow-hidden">
              <span className="sidebar-icon text-indigo-600 dark:text-indigo-400" title={`代码贡献者 (${authors.length} 位, 共 ${totalCommits} 次提交)`}>
                <Users className="w-4 h-4" />
              </span>
              <div className="sidebar-detail sidebar-author-summary flex items-center justify-between text-[11px] text-slate-500 dark:text-[#8b949e]" inert={collapsed} aria-hidden={collapsed}>
                <span className="font-semibold whitespace-nowrap">代码贡献者 {authors.length > 0 && `(${authors.length})`}</span>
                {selectedAuthor ? (
                  <button type="button" onClick={() => onSelectAuthor?.(undefined)} className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline whitespace-nowrap" title="取消作者筛选，展示所有提交">
                    重置全部
                  </button>
                ) : authors.length > 0 && <span className="text-[10px] font-mono whitespace-nowrap">共 {totalCommits} 提交</span>}
              </div>
            </div>
            {!activeRepo || (!isLoadingAuthors && authors.length === 0) ? (
              <div className="sidebar-fold" aria-hidden={collapsed}>
                <div>
                  <div className="sidebar-empty px-3 pb-3 text-center text-xs text-slate-400">
                    {!activeRepo ? '请选择仓库以查看贡献者' : '当前仓库暂无贡献者'}
                  </div>
                </div>
              </div>
            ) : isLoadingAuthors ? (
              <div className="sidebar-author-loading flex items-center h-10 shrink-0 text-xs text-slate-400">
                <span className="sidebar-icon"><Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" /></span>
                <span className="sidebar-detail whitespace-nowrap" aria-hidden={collapsed}>正在统计贡献者...</span>
              </div>
            ) : (
              <div className="sidebar-authors overflow-y-auto overflow-x-hidden space-y-1.5 pb-2">
                {authors.map(author => {
                  const isSelected = selectedAuthor === author.name;
                  return (
                    <motion.button
                      key={`${author.name}-${author.email || ''}`}
                      type="button"
                      whileTap={{ scale: 0.98 }}
                      onClick={() => onSelectAuthor?.(isSelected ? undefined : author.name)}
                      aria-label={`${author.name}，${author.commitsCount} 次提交`}
                      aria-pressed={isSelected}
                      title={`${author.name} (${author.email || '无邮箱'}) - 共 ${author.commitsCount} 次提交${isSelected ? ' (已过滤，点击显示全部)' : ' (点击筛选此作者)'}`}
                      className={`sidebar-author w-full h-10 flex items-center rounded-xl transition-colors cursor-pointer text-left ${
                        isSelected
                          ? 'bg-indigo-50/90 dark:bg-indigo-950/60 ring-1 ring-inset ring-indigo-400 text-indigo-950 dark:text-indigo-100'
                          : 'hover:bg-slate-200/60 dark:hover:bg-[#21262d] text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span className="sidebar-icon">
                        <AuthorAvatar name={author.name} email={author.email} size="sm" />
                      </span>
                      <span className="sidebar-detail sidebar-author-summary flex items-center justify-between gap-2 pr-2" aria-hidden={collapsed}>
                        <span className="truncate text-xs font-medium">{author.name}</span>
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full shrink-0 ${isSelected ? 'bg-indigo-200/80 dark:bg-indigo-900' : 'bg-slate-200/60 dark:bg-[#30363d] text-slate-500 dark:text-slate-400'}`}>
                          {author.commitsCount}
                        </span>
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </aside>
      <ConfirmDeleteModal isOpen={!!repoToDelete} repoName={repoToDelete?.name || ''} onConfirm={handleConfirmRemove} onCancel={() => setRepoToDelete(null)} />
    </>
  );

  function renderGroupHeading(label: string) {
    return (
      <div className="sidebar-fold" aria-hidden={collapsed}>
        <div>
          <div className="sidebar-group-heading h-6 text-[11px] font-semibold text-slate-400 dark:text-[#8b949e] whitespace-nowrap">{label}</div>
        </div>
      </div>
    );
  }

  function renderRepoItem(repo: typeof repositories[0]) {
    const isActive = activeRepo?.id === repo.id;
    return (
      <div
        key={repo.id}
        className={`sidebar-repo group relative h-[60px] flex items-center rounded-2xl transition-colors ${
          isActive ? 'bg-indigo-50/90 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200 ring-1 ring-inset ring-indigo-500/20' : 'hover:bg-slate-100/80 dark:hover:bg-[#21262d]/70 text-slate-700 dark:text-[#c9d1d9]'
        }`}
      >
        <button
          type="button"
          onClick={() => { selectRepo(repo.id); setFilterQuery(''); }}
          title={`${repo.name}\n${repo.path}`}
          aria-label={`打开仓库 ${repo.name}`}
          aria-current={isActive ? 'true' : undefined}
          className="absolute inset-0 w-full h-full rounded-2xl"
        />
        <span className="sidebar-icon pointer-events-none">
          <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-bold transition-colors ${isActive ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-200/70 dark:bg-[#30363d] text-slate-600 dark:text-slate-300'}`}>
            {repo.name.substring(0, 2).toUpperCase()}
          </span>
        </span>
        <div className="sidebar-detail sidebar-repo-summary pointer-events-none" inert={collapsed} aria-hidden={collapsed}>
          <div className="flex h-6 items-center justify-between gap-1">
            <span className="text-xs font-semibold truncate">{repo.name}</span>
            <div className="sidebar-repo-tools relative pointer-events-auto opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 flex items-center gap-0.5 transition-opacity shrink-0">
              <motion.button type="button" whileTap={{ scale: 1.15 }} onClick={e => handleToggleStar(e, repo.id, repo.name, repo.isStarred)} title={repo.isStarred ? '取消收藏' : '置顶收藏'} className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-slate-200/60 dark:hover:bg-[#30363d]">
                <Star className={`w-3 h-3 ${repo.isStarred ? 'fill-amber-400 text-amber-400' : 'text-slate-400'}`} />
              </motion.button>
              <button type="button" onClick={e => handleRequestRemove(e, repo.id, repo.name)} title="移除" className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-rose-100 dark:hover:bg-rose-950/50 text-slate-400 hover:text-rose-500">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 dark:text-[#8b949e] whitespace-nowrap overflow-hidden">
            <span className="flex items-center gap-1 min-w-0 max-w-[100px] font-medium">
              <GitBranch className="w-3 h-3 shrink-0 text-indigo-500" />
              <span className="truncate">{repo.currentBranch}</span>
            </span>
            {repo.lastCommitDate && (
              <span className="flex items-center gap-0.5 shrink-0 text-[10px] text-slate-400">
                <Clock className="w-2.5 h-2.5" />
                {formatDistanceToNow(new Date(repo.lastCommitDate), { addSuffix: true, locale: zhCN })}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }
});
