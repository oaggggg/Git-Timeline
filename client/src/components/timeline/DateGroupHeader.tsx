import React from 'react';
import { motion } from 'framer-motion';
import { Calendar } from 'lucide-react';

interface DateGroupHeaderProps {
  dateLabel: string;
  commitCount: number;
}

export const DateGroupHeader: React.FC<DateGroupHeaderProps> = ({ dateLabel, commitCount }) => {
  return (
    <div className="sticky top-0 z-20 py-3.5 bg-slate-50 dark:bg-[#0d1117] flex items-center gap-3">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-semibold bg-white dark:bg-[#161b22] border border-slate-200 dark:border-[#30363d] text-slate-700 dark:text-slate-200 shadow-xs"
      >
        <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
        <span>{dateLabel}</span>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-[#21262d] text-slate-500 dark:text-[#8b949e]">
          {commitCount} 次提交
        </span>
      </motion.div>
      <div className="flex-1 h-px bg-slate-200 dark:bg-[#30363d]" />
    </div>
  );
};
