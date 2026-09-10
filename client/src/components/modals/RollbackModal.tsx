import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CommitItem } from '../../types';
import { gitReset } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { RotateCcw, AlertTriangle, ShieldCheck, RefreshCw, X, Loader2, GitCommit } from 'lucide-react';
import { format } from 'date-fns';

interface RollbackModalProps {
  isOpen: boolean;
  repoId: string;
  commit: CommitItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

type ResetMode = 'mixed' | 'soft' | 'hard';

interface ModeOption {
  key: ResetMode;
  title: string;
  badge: string;
  badgeType: 'safe' | 'default' | 'danger';
  desc: string;
  icon: React.ElementType;
}

const MODES: ModeOption[] = [
  {
    key: 'mixed',
    title: '回到此版本，保留我写的所有代码 (--mixed)',
    badge: '新手首选 · 绝对安全',
    badgeType: 'safe',
    desc: '最安全温和的回退方式。撤销指定提交，但您写的所有改动都会完整保留在本地文件里（未暂存），随时可重新修改。代码绝不丢失。',
    icon: ShieldCheck
  },
  {
    key: 'soft',
    title: '回到此版本，改动自动放进待提交清单 (--soft)',
    badge: '安全 · 便于整理',
    badgeType: 'default',
    desc: '撤销指定提交，改动继续完整保留在暂存区（Staged），适合微调提交说明或补充新修改后重新提交。',
    icon: RefreshCw
  },
  {
    key: 'hard',
    title: '彻底还原到当年的状态，不保留后续改动 (--hard)',
    badge: '高危慎用 · 彻底清空',
    badgeType: 'danger',
    desc: '彻底丢弃指定提交之后的所有代码修改，仓库强制还原成历史原貌。后续代码将被永久抹去，新手请勿随意使用。',
    icon: AlertTriangle
  }
];

export const RollbackModal: React.FC<RollbackModalProps> = ({
  isOpen,
  repoId,
  commit,
  onClose,
  onSuccess
}) => {
  const { showToast } = useToast();
  const [mode, setMode] = useState<ResetMode>('mixed');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setMode('mixed');
      setIsSubmitting(false);
      setError(null);
    }
  }, [isOpen, commit?.hash]);

  // ESC key listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (typeof document === 'undefined' || !commit) return null;

  const handleExecuteReset = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      await gitReset(repoId, commit.hash, mode);
      const modeText = mode === 'hard' ? '强行回退' : mode === 'soft' ? '软回退' : '混合回退';
      showToast(`已成功执行 ${modeText} 至提交 ${commit.shortHash}`, 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || '回退操作失败，请检查工作区文件状态');
    } finally {
      setIsSubmitting(false);
    }
  };

  const commitDateStr = format(new Date(commit.authorDate), 'yyyy年MM月dd日 HH:mm');

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-lg bg-white dark:bg-[#161b22] rounded-3xl shadow-2xl border border-slate-200/80 dark:border-[#30363d] overflow-hidden flex flex-col max-h-[90vh]"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 dark:border-[#30363d] shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-2xs">
                  <RotateCcw className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    回退分支至此提交 (Git Reset)
                  </h3>
                  <p className="text-[11px] text-slate-400 dark:text-[#8b949e]">
                    选择回退模式以将 HEAD 指针移动到指定提交
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-[#21262d] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4.5 overflow-y-auto">
              {/* Target Commit Preview Card */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0d1117] border border-slate-200/70 dark:border-[#30363d]">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold">
                      {commit.shortHash}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                      {commit.authorName} · {commitDateStr}
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    目标提交
                  </span>
                </div>
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-2">
                  {commit.subject}
                </div>
              </div>

              {/* Mode Selection Cards */}
              <div className="space-y-2.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  选择回退模式
                </label>

                {MODES.map(item => {
                  const isSelected = mode === item.key;
                  const Icon = item.icon;

                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setMode(item.key)}
                      className={`w-full p-3.5 rounded-2xl border text-left transition-all relative ${
                        isSelected
                          ? item.key === 'hard'
                            ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-400 dark:border-rose-600 ring-2 ring-rose-500/20'
                            : 'bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-400 dark:border-indigo-600 ring-2 ring-indigo-500/20'
                          : 'bg-white dark:bg-[#161b22] border-slate-200 dark:border-[#30363d] hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <Icon className={`w-4 h-4 shrink-0 ${
                            item.key === 'hard' ? 'text-rose-500' : 'text-indigo-500'
                          }`} />
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                            {item.title}
                          </span>
                        </div>

                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                          item.badgeType === 'danger'
                            ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                            : item.badgeType === 'safe'
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                            : 'bg-slate-100 dark:bg-[#21262d] text-slate-600 dark:text-slate-400'
                        }`}>
                          {item.badge}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-500 dark:text-[#8b949e] leading-relaxed pl-6">
                        {item.desc}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Hard Mode Red Warning Alert */}
              {mode === 'hard' ? (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2 leading-relaxed"
                >
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                  <div>
                    <span className="font-bold">高风险警示：</span>
                    当前分支在此提交之后的所有改动将彻底抹除并不可找回。请确认无重要修改遗留！
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs flex items-start gap-2 leading-relaxed"
                >
                  <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <span className="font-bold">安全保障：</span>
                    当前模式绝对不会删除您的任何实际代码文件。回退后您依然可以在文件列表或编辑器中看到修改内容。
                  </div>
                </motion.div>
              )}

              {/* Error Callout */}
              {error && (
                <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs">
                  {error}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2.5 px-6 py-4 bg-slate-50/80 dark:bg-[#0d1117]/80 border-t border-slate-100 dark:border-[#30363d] shrink-0">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold rounded-full border border-slate-200 dark:border-[#30363d] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#21262d] transition-colors"
              >
                取消
              </button>

              <motion.button
                whileTap={{ scale: 0.96 }}
                type="button"
                onClick={handleExecuteReset}
                disabled={isSubmitting}
                className={`flex items-center gap-1.5 px-5 py-2 text-xs font-semibold rounded-full text-white shadow-xs transition-colors ${
                  mode === 'hard'
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20'
                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>正在回退...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{mode === 'hard' ? '确定强行回退' : '确认执行回退'}</span>
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
