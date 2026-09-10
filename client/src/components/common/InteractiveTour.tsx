import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GitBranch, 
  GitCommit, 
  ArrowUpRight, 
  Clock, 
  Search, 
  ChevronRight, 
  ChevronLeft, 
  X, 
  Sparkles,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';

export interface TourStep {
  targetSelector: string;
  badge: string;
  title: string;
  description: string;
  tip: string;
  icon: React.ElementType;
}

const TOUR_STEPS: TourStep[] = [
  {
    targetSelector: '[data-tour="branch-selector"]',
    badge: '新手关卡 1/5 · 基础指挥',
    title: '平行宇宙：分支管理 (Branch)',
    description: 'Git 就像多元宇宙！默认在 main 主干上开发。想要尝试新功能又怕改坏现有代码？在此点击随时切换分支，或新建属于你的独立平行宇宙。',
    tip: '分支之间完全隔离，在里面随便折腾，丝毫不会影响主干代码。',
    icon: GitBranch,
  },
  {
    targetSelector: '[data-tour="commit-btn"]',
    badge: '新手关卡 2/5 · 进度存档',
    title: '安全存档：保存并提交 (Commit)',
    description: '写好一段代码后，点击这个显眼的紫色按钮。系统会自动打包您修改过的文件，填写一句话说明即可一键同步保存到本地并推送到云端！',
    tip: '新手首选【一键提交并推送】，一次点击双重保险，再也不怕忘记上传云端。',
    icon: GitCommit,
  },
  {
    targetSelector: '[data-tour="actions-toolbar"]',
    badge: '新手关卡 3/5 · 云端协同',
    title: '团队协作与撤回后悔药',
    description: '【拉取最新】可下载合并队友的最新改动，【推送到云端】随时备份。如果不小心写错了，在【更多操作】里还有【撤回上次提交】，代码完好保留在暂存区！',
    tip: '所有操作均设防误触保护，绝对不删您在本地写好的代码文件。',
    icon: ArrowUpRight,
  },
  {
    targetSelector: '[data-tour="timeline-card"]',
    badge: '新手关卡 4/5 · 时光之轴',
    title: '可视化的代码时光隧道',
    description: '下方时间轴记录了项目的完整历史。每一张卡片都是一个历史存档点，您可以查看文件变动细节，或者点击【回退 / 操作】让时光倒流到任意历史节点。',
    tip: '系统默认采用【保留代码回退模式】，时光可以倒流，写好的代码永不丢失。',
    icon: Clock,
  },
  {
    targetSelector: '[data-tour="search-and-theme"]',
    badge: '新手关卡 5/5 · 畅享探索',
    title: '极速搜索与沉浸主题',
    description: '输入关键词即可秒级检索提交记录，失焦或点击空白自动收起清空。右侧支持跟随系统、浅色、深色主题自由滑动切换。恭喜您完成新手引导！',
    tip: '随时点击顶部【问号/指南】图标，即可重新召唤本向导。',
    icon: Search,
  },
];

interface InteractiveTourProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InteractiveTour: React.FC<InteractiveTourProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // Resolve the target from the requested step, never from a stale effect closure.
  const updateTargetRect = (stepIndex = currentStep) => {
    if (!isOpen) return;
    const step = TOUR_STEPS[stepIndex];
    const el = document.querySelector(step.targetSelector);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
    } else {
      // If target not found (e.g. no commit card yet), center on screen
      setTargetRect(null);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    setCurrentStep(0);
    setTargetRect(null);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    let frameId = requestAnimationFrame(() => updateTargetRect(currentStep));
    const refresh = () => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => updateTargetRect(currentStep));
    };
    window.addEventListener('resize', refresh);
    window.addEventListener('scroll', refresh, true);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', refresh);
      window.removeEventListener('scroll', refresh, true);
    };
  }, [currentStep, isOpen]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (currentStep < TOUR_STEPS.length - 1) {
          setCurrentStep(prev => prev + 1);
        } else {
          onClose();
        }
      } else if (e.key === 'ArrowLeft') {
        if (currentStep > 0) {
          setCurrentStep(prev => prev - 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStep, onClose]);

  if (typeof document === 'undefined' || !isOpen) return null;

  const step = TOUR_STEPS[currentStep];
  const StepIcon = step.icon;
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === TOUR_STEPS.length - 1;
  const progressPercent = Math.round(((currentStep + 1) / TOUR_STEPS.length) * 100);

  // Compute dialog card positioning relative to target rect
  const getCardPositionStyle = (): React.CSSProperties => {
    if (!targetRect) {
      // Fallback: center of screen
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const cardWidth = Math.min(420, windowWidth - 32);

    // Prefer placing below the target if enough space, else above
    const spaceBelow = windowHeight - targetRect.bottom;
    const placeBelow = spaceBelow > 320 || targetRect.top < 220;

    let top = placeBelow ? targetRect.bottom + 16 : targetRect.top - 320;
    if (top < 16) top = 16;
    if (top + 320 > windowHeight - 16) top = windowHeight - 336;

    // Horizontal alignment: center on target, clamped to screen
    let left = targetRect.left + targetRect.width / 2 - cardWidth / 2;
    if (left < 16) left = 16;
    if (left + cardWidth > windowWidth - 16) left = windowWidth - cardWidth - 16;

    return {
      top: `${top}px`,
      left: `${left}px`,
      width: `${cardWidth}px`,
    };
  };

  return createPortal(
    <div className="fixed inset-0 z-[200] select-none overflow-hidden">
      {/* Dimmed Backdrop with Spotlight Cutout */}
      <div 
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Spotlight Ring around target element */}
      {targetRect && (
        <motion.div
          initial={false}
          animate={{
            top: targetRect.top - 6,
            left: targetRect.left - 6,
            width: targetRect.width + 12,
            height: targetRect.height + 12,
          }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="absolute rounded-2xl pointer-events-none z-[205]"
          style={{
            boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.65), 0 0 25px rgba(99, 102, 241, 0.45)',
          }}
        >
          {/* Pulsing neon highlight ring */}
          <div className="w-full h-full rounded-2xl ring-2 ring-indigo-400 dark:ring-indigo-500 animate-pulse" />
        </motion.div>
      )}

      {/* Game-style Floating Tutorial Card */}
      <motion.div
        key={`tour-step-${currentStep}`}
        initial={{ opacity: 0, y: 10, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.96 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        style={getCardPositionStyle()}
        className="absolute z-[210] bg-white dark:bg-[#161b22] rounded-3xl shadow-2xl border border-slate-200/90 dark:border-[#30363d] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Card Header & Progress Bar */}
        <div className="relative p-5 pb-3 border-b border-slate-100 dark:border-[#30363d]/80 bg-slate-50/70 dark:bg-[#0d1117]/50">
          {/* Top Progress bar */}
          <div className="w-full h-1 bg-slate-200 dark:bg-[#30363d] rounded-full overflow-hidden mb-3">
            <motion.div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
              initial={{ width: `${((currentStep) / TOUR_STEPS.length) * 100}%` }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800">
                {step.badge}
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                {progressPercent}%
              </span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-slate-200 dark:hover:bg-[#21262d] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              title="跳过引导 (ESC)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Card Content */}
        <div className="p-5 space-y-3.5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-xs border border-indigo-100 dark:border-indigo-900/40">
              <StepIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug">
                {step.title}
              </h3>
              <p className="text-xs text-slate-600 dark:text-[#8b949e] mt-1.5 leading-relaxed">
                {step.description}
              </p>
            </div>
          </div>

          {/* Tips Pill */}
          <div className="p-2.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-[11px] text-indigo-700 dark:text-indigo-300 flex items-start gap-2 leading-relaxed">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">向导秘籍：</span>
              {step.tip}
            </div>
          </div>
        </div>

        {/* Card Footer Controls */}
        <div className="px-5 py-3.5 bg-slate-50/80 dark:bg-[#0d1117]/80 border-t border-slate-100 dark:border-[#30363d] flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors whitespace-nowrap shrink-0"
          >
            跳过引导
          </button>

          <div className="flex items-center gap-2 shrink-0">
            {!isFirstStep && (
              <button
                type="button"
                onClick={() => setCurrentStep(prev => prev - 1)}
                className="px-3.5 py-1.5 rounded-full border border-slate-200 dark:border-[#30363d] hover:bg-slate-100 dark:hover:bg-[#21262d] text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1 whitespace-nowrap shrink-0"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>上一步</span>
              </button>
            )}

            <motion.button
              whileTap={{ scale: 0.96 }}
              type="button"
              onClick={() => {
                if (isLastStep) {
                  onClose();
                } else {
                  setCurrentStep(prev => prev + 1);
                }
              }}
              className="px-4 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              <span>{isLastStep ? '完成新手引导' : '下一步'}</span>
              {isLastStep ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>,
    document.body
  );
};
