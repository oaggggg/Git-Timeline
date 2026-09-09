import React from 'react';
import { motion } from 'framer-motion';
import { Calendar } from 'lucide-react';

interface DateGroupHeaderProps {
  dateLabel: string;
  commitCount: number;
}

export const DateGroupHeader: React.FC<DateGroupHeaderProps> = ({ dateLabel, commitCount }) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="sticky top-14 z-20 py-3 bg-slate-50/90 dark:bg-[#0d1117]/90 backdrop-blur-md flex items-center gap-2.5"
    >
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white dark:bg-[#161b22] border border-slate-200 dark:border-[#30363d] text-slate-700 dark:text-slate-200 shadow-xs">
        <Calendar className="w-3.5 h-3.5 text-indigo-500" />
        <span>{dateLabel}</span>
        <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-[#21262d] text-slate-500 dark:text-[#8b949e]">
          {commitCount} 次提交
        </span>
      </div>
      <div className="flex-1 h-px bg-slate-200 dark:bg-[#30363d]" />
    </motion.div>
  );
};
