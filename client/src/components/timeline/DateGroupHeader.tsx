import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, ChevronDown, Check } from 'lucide-react';

export type DateFilterRange = 'ALL' | 'today' | 'yesterday' | '7days' | '30days';

export interface DateFilterOption {
  key: DateFilterRange;
  label: string;
  tooltip: string;
}

export const DATE_FILTER_OPTIONS: DateFilterOption[] = [
  { key: 'ALL', label: '全部', tooltip: '查看所有历史提交' },
  { key: 'today', label: '今天', tooltip: '筛选今天 00:00 至今的提交' },
  { key: 'yesterday', label: '昨天', tooltip: '筛选昨天全天的提交' },
  { key: '7days', label: '7天', tooltip: '筛选最近 7 天内的提交' },
  { key: '30days', label: '30天', tooltip: '筛选最近 30 天内的提交' },
];

interface DateGroupHeaderProps {
  dateLabel: string;
  commitCount: number;
  isFirstGroup?: boolean;
  activeFilter?: DateFilterRange;
  onFilterChange?: (filter: DateFilterRange) => void;
}

export const DateGroupHeader: React.FC<DateGroupHeaderProps> = ({
  dateLabel,
  commitCount,
  isFirstGroup = false,
  activeFilter = 'ALL',
  onFilterChange,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent | PointerEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('pointerdown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDropdownOpen]);

  return (
    <div className="sticky top-0 z-20 py-3 bg-slate-50/95 dark:bg-[#0d1117]/95 backdrop-blur-xs flex items-center justify-between gap-3">
      {/* Date badge with optional dropdown toggle */}
      <div ref={dropdownRef} className="relative shrink-0">
        <motion.button
          type="button"
          whileTap={{ scale: 0.96 }}
          onClick={() => onFilterChange && setIsDropdownOpen(prev => !prev)}
          className={`flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-semibold bg-white dark:bg-[#161b22] border border-slate-200 dark:border-[#30363d] text-slate-700 dark:text-slate-200 shadow-xs transition-colors ${
            onFilterChange ? 'cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500' : ''
          }`}
          title={onFilterChange ? '点击切换时间范围筛选' : undefined}
        >
          <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
          <span>{dateLabel}</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-[#21262d] text-slate-500 dark:text-[#8b949e]">
            {commitCount} 次提交
          </span>
          {onFilterChange && (
            <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          )}
        </motion.button>

        {/* Dropdown Menu for Date Filters */}
        <AnimatePresence>
          {isDropdownOpen && onFilterChange && (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 mt-1.5 w-44 p-1.5 rounded-2xl bg-white dark:bg-[#161b22] border border-slate-200 dark:border-[#30363d] shadow-2xl z-30 space-y-0.5 text-xs"
            >
              <div className="text-[10px] font-semibold text-slate-400 px-2.5 py-1 uppercase tracking-wider">
                时间范围筛选
              </div>
              {DATE_FILTER_OPTIONS.map(opt => {
                const isSelected = activeFilter === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => {
                      onFilterChange(opt.key);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left transition-colors ${
                      isSelected
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold'
                        : 'hover:bg-slate-100 dark:hover:bg-[#21262d] text-slate-700 dark:text-slate-300'
                    }`}
                    title={opt.tooltip}
                  >
                    <span>{opt.label === 'ALL' ? '全部时间' : opt.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />}
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Divider line */}
      <div className="flex-1 h-px bg-slate-200/80 dark:border-[#30363d]" />

      {/* Quick Filter Segmented Buttons (rendered on the first group or top bar) */}
      {isFirstGroup && onFilterChange && (
        <div className="flex items-center gap-1 p-0.5 rounded-full bg-slate-200/60 dark:bg-[#21262d] border border-slate-200/60 dark:border-[#30363d] shrink-0 text-xs select-none">
          {DATE_FILTER_OPTIONS.map(opt => {
            const isSelected = activeFilter === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => onFilterChange(opt.key)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-white dark:bg-[#30363d] text-indigo-600 dark:text-indigo-400 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 dark:text-[#8b949e] dark:hover:text-slate-200'
                }`}
                title={opt.tooltip}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
