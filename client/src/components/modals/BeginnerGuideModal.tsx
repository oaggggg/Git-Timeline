import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  HelpCircle, 
  X, 
  GitCommit, 
  RotateCcw, 
  GitBranch, 
  ArrowUpFromLine, 
  ArrowDownToLine, 
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';

interface BeginnerGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCommit?: () => void;
  onOpenBranch?: () => void;
}

export const BeginnerGuideModal: React.FC<BeginnerGuideModalProps> = ({
  isOpen,
  onClose,
  onOpenCommit,
  onOpenBranch,
}) => {
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

  if (typeof document === 'undefined') return null;

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
            className="w-full max-w-xl bg-white dark:bg-[#161b22] rounded-3xl shadow-2xl border border-slate-200/80 dark:border-[#30363d] overflow-hidden flex flex-col max-h-[90vh]"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 dark:border-[#30363d] shrink-0 bg-slate-50/50 dark:bg-[#161b22]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-2xs">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <span>新手快速上手指南</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400">
                      零门槛白话版
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400 dark:text-[#8b949e]">
                    不用背黑话命令，常见操作场景一览即通
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
            <div className="p-6 space-y-4 overflow-y-auto">
              {/* Concept Fast Table */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0d1117] border border-slate-200/70 dark:border-[#30363d]">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-2 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                  <span>3 秒搞懂 Git 四大基础概念</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-[#161b22] border border-slate-100 dark:border-[#30363d]/60">
                    <div className="font-semibold text-indigo-600 dark:text-indigo-400 mb-0.5 flex items-center gap-1">
                      <GitCommit className="w-3 h-3" />
                      <span>提交 (Commit)</span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      给电脑里写好的代码存一个“历史存档点”，保存在本地。
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-[#161b22] border border-slate-100 dark:border-[#30363d]/60">
                    <div className="font-semibold text-emerald-600 dark:text-emerald-400 mb-0.5 flex items-center gap-1">
                      <ArrowUpFromLine className="w-3 h-3" />
                      <span>推送 (Push)</span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      把本地存好的所有历史记录上传备份到 GitHub 云端代码库。
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-[#161b22] border border-slate-100 dark:border-[#30363d]/60">
                    <div className="font-semibold text-sky-600 dark:text-sky-400 mb-0.5 flex items-center gap-1">
                      <ArrowDownToLine className="w-3 h-3" />
                      <span>拉取 (Pull)</span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      把云端最新的修改（比如同事写的新功能）下载合并到本地。
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-[#161b22] border border-slate-100 dark:border-[#30363d]/60">
                    <div className="font-semibold text-purple-600 dark:text-purple-400 mb-0.5 flex items-center gap-1">
                      <GitBranch className="w-3 h-3" />
                      <span>分支 (Branch)</span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      一条平行的独立工作路线。在里面随便改，丝毫不会影响主干。
                    </div>
                  </div>
                </div>
              </div>

              {/* Scenario 1 */}
              <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-[#30363d] hover:border-indigo-200 dark:hover:border-indigo-900 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-[11px] flex items-center justify-center font-bold">1</span>
                      <span>我刚刚写完了新功能/改好了代码，该怎么保存？</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-[#8b949e] mt-1.5 leading-relaxed pl-7">
                      点击顶部紫色按钮【保存并提交】，在弹窗中选择中文分类（如“新增功能”），填写一句话说明，点击【一键提交并推送 (推荐)】，即可一步搞定本地保存与云端同步！
                    </p>
                  </div>
                  {onOpenCommit && (
                    <button
                      onClick={() => {
                        onClose();
                        onOpenCommit();
                      }}
                      className="shrink-0 px-3 py-1 text-[11px] font-semibold rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-colors"
                    >
                      去提交
                    </button>
                  )}
                </div>
              </div>

              {/* Scenario 2 */}
              <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-[#30363d] hover:border-amber-200 dark:hover:border-amber-900 transition-colors">
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 text-[11px] flex items-center justify-center font-bold">2</span>
                    <span>刚才提交写错了字，或者漏掉了文件，想撤回？</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-[#8b949e] mt-1.5 leading-relaxed pl-7">
                    点击顶部右侧的【更多操作】（三个点图标），点击【撤回上次提交 (Undo)】。不用慌！刚才提交写好的代码一行都不会少，会全部完好保留在待提交清单中，您可以重新修改后再提交。
                  </p>
                </div>
              </div>

              {/* Scenario 3 */}
              <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-[#30363d] hover:border-emerald-200 dark:hover:border-emerald-900 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 text-[11px] flex items-center justify-center font-bold">3</span>
                      <span>想尝试写个新功能，但担心把现有的代码改乱？</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-[#8b949e] mt-1.5 leading-relaxed pl-7">
                      点击顶部【新建分支】，输入分支名字（例如 <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#21262d] font-mono text-[11px]">my-test</code>）。这相当于复印了一份完全独立的项目副本，放心大胆折腾！测试满意后再发起合并。
                    </p>
                  </div>
                  {onOpenBranch && (
                    <button
                      onClick={() => {
                        onClose();
                        onOpenBranch();
                      }}
                      className="shrink-0 px-3 py-1 text-[11px] font-semibold rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 transition-colors"
                    >
                      建分支
                    </button>
                  )}
                </div>
              </div>

              {/* Scenario 4 */}
              <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-[#30363d] hover:border-purple-200 dark:hover:border-purple-900 transition-colors">
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 text-[11px] flex items-center justify-center font-bold">4</span>
                    <span>想把代码版本时间倒流回过去的某个时刻？</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-[#8b949e] mt-1.5 leading-relaxed pl-7">
                    在时间轴找到那个历史提交卡片，点击右侧的【回退 / 操作】，选择【回退到这个版本】。系统默认选中【回到此版本，保留我写的所有代码（新手首选）】，历史会倒流回去，而您写的所有代码绝不会丢失！
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 dark:border-[#30363d] bg-slate-50/50 dark:bg-[#161b22] flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="w-4 h-4" />
                <span>所有操作均设防误触保护与安全撤销机制</span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white shadow-xs transition-colors"
              >
                我知道了，开始使用
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
