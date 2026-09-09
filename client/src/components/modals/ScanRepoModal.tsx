import React, { useState } from 'react';
import { useRepo } from '../../context/RepoContext';
import { scanRepos } from '../../services/api';
import { X, Sparkles, Loader2, FolderGit2, Check, AlertCircle } from 'lucide-react';

interface ScanRepoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ScanRepoModal: React.FC<ScanRepoModalProps> = ({ isOpen, onClose }) => {
  const { addNewRepo } = useRepo();
  const [rootPath, setRootPath] = useState('');
  const [maxDepth, setMaxDepth] = useState(3);
  const [isScanning, setIsScanning] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [discovered, setDiscovered] = useState<{ path: string; name: string }[]>([]);
  const [selectedPaths, setSelectedPaths] = useState<Record<string, boolean>>({});

  if (!isOpen) return null;

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rootPath.trim()) return;

    setIsScanning(true);
    setError(null);
    try {
      const res = await scanRepos(rootPath.trim(), maxDepth);
      setDiscovered(res.repositories);
      const initialSelected: Record<string, boolean> = {};
      res.repositories.forEach(r => {
        initialSelected[r.path] = true;
      });
      setSelectedPaths(initialSelected);
      if (res.repositories.length === 0) {
        setError('未在指定目录下发现任何包含 .git 的子仓库。');
      }
    } catch (err: any) {
      setError(err.message || '扫描失败，请检查目录路径是否正确');
    } finally {
      setIsScanning(false);
    }
  };

  const toggleSelectAll = (select: boolean) => {
    const updated: Record<string, boolean> = {};
    discovered.forEach(d => {
      updated[d.path] = select;
    });
    setSelectedPaths(updated);
  };

  const handleImport = async () => {
    const toImport = discovered.filter(d => selectedPaths[d.path]);
    if (toImport.length === 0) return;

    setIsImporting(true);
    try {
      for (const item of toImport) {
        await addNewRepo(item.path, item.name);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || '导入部分仓库失败');
    } finally {
      setIsImporting(false);
    }
  };

  const selectedCount = Object.values(selectedPaths).filter(Boolean).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-xl bg-white dark:bg-[#161b22] border border-slate-200 dark:border-[#30363d] shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-slate-800 dark:text-[#e6edf3]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-[#30363d]">
          <div className="flex items-center gap-2 font-semibold text-sm">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>扫描目录自动发现 Git 仓库</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <form onSubmit={handleScan} className="space-y-3">
            <div className="flex gap-2">
              <div className="flex-1">
                <input
                  type="text"
                  required
                  placeholder="输入要扫描的父目录，如 D:\projects"
                  value={rootPath}
                  onChange={e => setRootPath(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-[#30363d] focus:border-indigo-500 focus:outline-none dark:text-slate-200 font-mono"
                />
              </div>
              <div className="w-24">
                <select
                  value={maxDepth}
                  onChange={e => setMaxDepth(parseInt(e.target.value, 10))}
                  className="w-full px-2 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-[#30363d] focus:border-indigo-500 focus:outline-none dark:text-slate-200"
                >
                  <option value={1}>深度 1 层</option>
                  <option value={2}>深度 2 层</option>
                  <option value={3}>深度 3 层</option>
                  <option value={4}>深度 4 层</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={isScanning || !rootPath.trim()}
                className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium disabled:opacity-50 transition-colors shadow-sm shrink-0"
              >
                {isScanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : '开始扫描'}
              </button>
            </div>
          </form>

          {error && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Discovered List */}
          {discovered.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-[#8b949e]">
                <span>发现 {discovered.length} 个 Git 仓库</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => toggleSelectAll(true)}
                    className="hover:underline text-indigo-500"
                  >
                    全选
                  </button>
                  <span>|</span>
                  <button
                    type="button"
                    onClick={() => toggleSelectAll(false)}
                    className="hover:underline text-slate-400"
                  >
                    取消全选
                  </button>
                </div>
              </div>

              <div className="max-h-60 overflow-y-auto border border-slate-200 dark:border-[#30363d] rounded-lg divide-y divide-slate-100 dark:divide-[#30363d]">
                {discovered.map(repo => {
                  const isChecked = !!selectedPaths[repo.path];
                  return (
                    <div
                      key={repo.path}
                      onClick={() =>
                        setSelectedPaths(prev => ({ ...prev, [repo.path]: !prev[repo.path] }))
                      }
                      className="flex items-center gap-2.5 p-2 hover:bg-slate-50 dark:hover:bg-[#21262d] cursor-pointer text-xs select-none"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="rounded text-indigo-600 focus:ring-0 cursor-pointer"
                      />
                      <FolderGit2 className="w-4 h-4 text-slate-400 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {repo.name}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono truncate">
                          {repo.path}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-slate-100 dark:border-[#30363d]">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-[#30363d] hover:bg-slate-100 dark:hover:bg-[#21262d]"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={isImporting || selectedCount === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-medium disabled:opacity-50 transition-colors shadow-sm"
          >
            {isImporting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            导入所选 ({selectedCount})
          </button>
        </div>
      </div>
    </div>
  );
};
