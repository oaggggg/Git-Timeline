import React from 'react';
import { motion } from 'framer-motion';
import { useTheme, ThemeMode } from '../../context/ThemeContext';
import { Sun, Moon, Laptop } from 'lucide-react';

interface ThemeOption {
  key: ThemeMode;
  label: string;
  icon: React.ElementType;
}

const THEME_OPTIONS: ThemeOption[] = [
  { key: 'light', label: '浅色', icon: Sun },
  { key: 'system', label: '系统', icon: Laptop },
  { key: 'dark', label: '深色', icon: Moon }
];

export const ThemeSlider: React.FC = () => {
  const { themeMode, setThemeMode } = useTheme();

  return (
    <div className="relative inline-flex items-center p-0.5 rounded-full bg-slate-100 dark:bg-[#21262d] border border-slate-200/80 dark:border-[#30363d] shadow-xs shrink-0 select-none">
      {THEME_OPTIONS.map(option => {
        const isActive = themeMode === option.key;
        const Icon = option.icon;

        return (
          <button
            key={option.key}
            type="button"
            onClick={() => setThemeMode(option.key)}
            className={`relative z-10 flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full transition-colors duration-150 whitespace-nowrap ${
              isActive
                ? 'text-slate-900 dark:text-white font-semibold'
                : 'text-slate-500 hover:text-slate-700 dark:text-[#8b949e] dark:hover:text-slate-200'
            }`}
            title={`切换为${option.label}模式`}
          >
            {isActive && (
              <motion.div
                layoutId="theme-active-indicator"
                className="absolute inset-0 bg-white dark:bg-[#30363d] rounded-full shadow-xs border border-slate-200/40 dark:border-slate-600/30"
                transition={{ type: 'spring', stiffness: 500, damping: 36 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="text-[11px] whitespace-nowrap">{option.label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
};
