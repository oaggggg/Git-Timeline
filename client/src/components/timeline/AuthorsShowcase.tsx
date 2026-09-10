import React from 'react';
import { motion } from 'framer-motion';
import { AuthorItem } from '../../types';
import { getAvatarColor, getInitials } from '../../utils/avatar';
import { Users, Check, X, UserCheck } from 'lucide-react';

interface AuthorsShowcaseProps {
  authors: AuthorItem[];
  selectedAuthor?: string;
  onSelectAuthor: (authorName?: string) => void;
  isLoading?: boolean;
}

export const AuthorsShowcase: React.FC<AuthorsShowcaseProps> = ({
  authors,
  selectedAuthor,
  onSelectAuthor,
  isLoading = false
}) => {
  if (authors.length === 0 && !isLoading) return null;

  const totalCommits = authors.reduce((sum, a) => sum + a.commitsCount, 0);

  return (
    <section 
      aria-label="仓库代码贡献者展示区域"
      className="bg-white/85 dark:bg-[#161b22]/85 backdrop-blur-md border-b border-slate-200/80 dark:border-[#30363d] px-4 lg:px-6 py-2.5 flex items-center justify-between gap-3 text-xs select-none shadow-2xs shrink-0 z-20"
    >
      {/* Left Title & Counter Badge */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-2xs">
          <Users className="w-3.5 h-3.5" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">
            提交贡献者
          </span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-[#21262d] text-slate-500 dark:text-[#8b949e] whitespace-nowrap">
            {authors.length} 位作者
          </span>
        </div>
      </div>

      {/* Right Scrollable Authors List */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 pl-2 max-w-full">
        {/* All Authors Reset Button */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => onSelectAuthor(undefined)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all shadow-2xs shrink-0 ${
            !selectedAuthor
              ? 'bg-indigo-600 text-white shadow-indigo-500/20'
              : 'bg-slate-100 dark:bg-[#21262d] hover:bg-slate-200 dark:hover:bg-[#30363d] text-slate-600 dark:text-slate-300'
          }`}
          title="展示所有作者的提交记录"
        >
          <span>全部作者</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
            !selectedAuthor ? 'bg-white/25 text-white' : 'bg-slate-200/80 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400'
          }`}>
            {totalCommits}
          </span>
        </motion.button>

        {/* Author Pills */}
        {authors.map(author => {
          const isSelected = selectedAuthor === author.name;
          const avatarColor = getAvatarColor(author.name);
          const initials = getInitials(author.name);

          return (
            <motion.button
              key={`${author.name}-${author.email}`}
              whileTap={{ scale: 0.95 }}
              onClick={() => onSelectAuthor(isSelected ? undefined : author.name)}
              className={`flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-full text-xs transition-all shadow-2xs shrink-0 border ${
                isSelected
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-400 dark:border-indigo-600 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/20 font-semibold'
                  : 'bg-slate-100/90 dark:bg-[#21262d] border-slate-200/80 dark:border-[#30363d] hover:border-slate-300 dark:hover:border-slate-500 text-slate-700 dark:text-slate-300'
              }`}
              title={`${author.name} (${author.email || '无邮箱'}) - 共 ${author.commitsCount} 次提交。点击${isSelected ? '取消筛选' : '仅查看此作者'}`}
            >
              {/* Colorful Initials Avatar */}
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-2xs shrink-0"
                style={{ backgroundColor: avatarColor }}
              >
                {initials}
              </div>

              {/* Author Name */}
              <span className="truncate max-w-[120px] whitespace-nowrap">
                {author.name}
              </span>

              {/* Commits Count Badge */}
              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-medium ${
                isSelected
                  ? 'bg-indigo-200/80 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200'
                  : 'bg-slate-200/80 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400'
              }`}>
                {author.commitsCount} 次
              </span>

              {isSelected && (
                <X className="w-3 h-3 text-indigo-500 hover:text-indigo-700 shrink-0 ml-0.5" />
              )}
            </motion.button>
          );
        })}
      </div>
    </section>
  );
};
