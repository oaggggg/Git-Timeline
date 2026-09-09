import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CommitItem, DiffData } from '../../types';
import { fetchCommitDiff } from '../../services/api';
import { 
  Plus, 
  Minus, 
  ChevronDown, 
  ChevronRight, 
  Columns2, 
  AlignLeft, 
  Search, 
  Loader2, 
  Binary
} from 'lucide-react';

interface CommitDiffViewProps {
  repoId: string;
  commit: CommitItem;
}

interface ParsedDiffFile {
  oldPath: string;
  newPath: string;
  status: 'added' | 'deleted' | 'modified' | 'renamed';
  chunks: DiffChunk[];
  additions: number;
  deletions: number;
  isBinary?: boolean;
}

interface DiffChunk {
  header: string;
  lines: DiffLine[];
}

interface DiffLine {
  type: 'context' | 'add' | 'del';
  oldLineNumber?: number;
  newLineNumber?: number;
  content: string;
}

export const CommitDiffView: React.FC<CommitDiffViewProps> = ({ repoId, commit }) => {
  const [diffData, setDiffData] = useState<DiffData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [diffMode, setDiffMode] = useState<'unified' | 'split'>('unified');
  const [fileFilter, setFileFilter] = useState('');
  const [collapsedFiles, setCollapsedFiles] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    fetchCommitDiff(repoId, commit.hash)
      .then(data => {
        if (isMounted) {
          setDiffData(data);
          setLoading(false);
        }
      })
      .catch(err => {
        if (isMounted) {
          setError(err.message || '加载 Diff 失败');
          setLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [repoId, commit.hash]);

  const parsedFiles = useMemo(() => {
    if (!diffData?.diff) return [];
    return parseGitPatch(diffData.diff);
  }, [diffData]);

  const toggleFileCollapse = (filePath: string) => {
    setCollapsedFiles(prev => ({
      ...prev,
      [filePath]: !prev[filePath]
    }));
  };

  const collapseAll = (collapsed: boolean) => {
    const newState: Record<string, boolean> = {};
    parsedFiles.forEach(f => {
      newState[f.newPath] = collapsed;
    });
    setCollapsedFiles(newState);
  };

  const filteredParsedFiles = parsedFiles.filter(f =>
    f.newPath.toLowerCase().includes(fileFilter.toLowerCase()) ||
    f.oldPath.toLowerCase().includes(fileFilter.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 text-xs text-slate-400 gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
        <span>正在解析代码变动细节...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-xs border border-rose-200 dark:border-rose-900/40">
        {error}
      </div>
    );
  }

  if (parsedFiles.length === 0) {
    return (
      <div className="p-4 text-center text-xs text-slate-400">
        该提交无文件内容变更（可能为合并提交或空提交）。
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="mt-3 pt-3 border-t border-slate-200/80 dark:border-[#30363d] space-y-3.5"
    >
      {/* Diff Controls Bar - Rounded 2XL */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 text-xs bg-slate-50 dark:bg-[#161b22] p-2.5 rounded-2xl border border-slate-200/80 dark:border-[#30363d]">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            {parsedFiles.length} 个文件变动
          </span>
          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-mono font-semibold">
            <Plus className="w-3 h-3" />
            {commit.stats.additions}
          </span>
          <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-mono font-semibold">
            <Minus className="w-3 h-3" />
            {commit.stats.deletions}
          </span>
        </div>

        {/* View mode toggle & Quick actions */}
        <div className="flex items-center gap-2">
          {/* File filter inside diff - Pill */}
          <div className="relative">
            <Search className="w-3 h-3 absolute left-2.5 top-2 text-slate-400" />
            <input
              type="text"
              placeholder="过滤文件..."
              value={fileFilter}
              onChange={e => setFileFilter(e.target.value)}
              className="pl-7 pr-3 py-1 text-xs rounded-full bg-white dark:bg-[#0d1117] border border-slate-200 dark:border-[#30363d] focus:outline-none dark:text-slate-200 placeholder-slate-400 w-32 focus:w-44 transition-all"
            />
          </div>

          {/* Dynamic animated mode switch - Pill */}
          <div className="relative flex items-center bg-slate-200/70 dark:bg-[#21262d] p-0.5 rounded-full border border-slate-200/80 dark:border-[#30363d]">
            <button
              onClick={() => setDiffMode('unified')}
              className={`relative z-10 flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold transition-colors ${
                diffMode === 'unified'
                  ? 'text-indigo-600 dark:text-indigo-300'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {diffMode === 'unified' && (
                <motion.div
                  layoutId="diffModeTab"
                  className="absolute inset-0 bg-white dark:bg-[#30363d] rounded-full shadow-xs -z-10"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <AlignLeft className="w-3 h-3" />
              Unified
            </button>
            <button
              onClick={() => setDiffMode('split')}
              className={`relative z-10 flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold transition-colors ${
                diffMode === 'split'
                  ? 'text-indigo-600 dark:text-indigo-300'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {diffMode === 'split' && (
                <motion.div
                  layoutId="diffModeTab"
                  className="absolute inset-0 bg-white dark:bg-[#30363d] rounded-full shadow-xs -z-10"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <Columns2 className="w-3 h-3" />
              Split
            </button>
          </div>

          <button
            onClick={() => collapseAll(true)}
            className="text-[11px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 px-2 py-1 rounded-full hover:bg-slate-200/50 dark:hover:bg-[#21262d] transition-colors"
          >
            全部折叠
          </button>
          <button
            onClick={() => collapseAll(false)}
            className="text-[11px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 px-2 py-1 rounded-full hover:bg-slate-200/50 dark:hover:bg-[#21262d] transition-colors"
          >
            全部展开
          </button>
        </div>
      </div>

      {/* Files Diff List */}
      <div className="space-y-3.5">
        {filteredParsedFiles.map((file, fileIdx) => {
          const isCollapsed = collapsedFiles[file.newPath];
          return (
            <div
              key={file.newPath + fileIdx}
              className="rounded-2xl border border-slate-200/80 dark:border-[#30363d] bg-white dark:bg-[#0d1117] overflow-hidden shadow-xs"
            >
              {/* File Header */}
              <div
                onClick={() => toggleFileCollapse(file.newPath)}
                className="flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-[#161b22] border-b border-slate-200/80 dark:border-[#30363d] cursor-pointer select-none hover:bg-slate-100/80 dark:hover:bg-[#21262d] transition-colors"
              >
                <div className="flex items-center gap-2.5 font-mono text-xs overflow-hidden">
                  <div className="text-slate-400 shrink-0">
                    {isCollapsed ? (
                      <ChevronRight className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </div>
                  {renderStatusBadge(file.status)}
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {file.newPath}
                  </span>
                  {file.status === 'renamed' && (
                    <span className="text-[11px] text-slate-400 truncate font-normal">
                      (重命名自 {file.oldPath})
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2.5 font-mono text-xs shrink-0">
                  {file.isBinary ? (
                    <span className="flex items-center gap-1 text-slate-400 text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-[#21262d]">
                      <Binary className="w-3 h-3" />
                      二进制文件
                    </span>
                  ) : (
                    <>
                      {file.additions > 0 && (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                          +{file.additions}
                        </span>
                      )}
                      {file.deletions > 0 && (
                        <span className="text-rose-600 dark:text-rose-400 font-semibold">
                          -{file.deletions}
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* File Diff Content */}
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-x-auto text-xs font-mono"
                  >
                    {file.isBinary ? (
                      <div className="p-8 flex flex-col items-center justify-center text-slate-400 gap-2.5">
                        <Binary className="w-7 h-7 text-slate-400" />
                        <span className="text-xs font-medium">二进制文件变更，无法生成文本比对</span>
                      </div>
                    ) : diffMode === 'unified' ? (
                      renderUnifiedView(file)
                    ) : (
                      renderSplitView(file)
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </motion.div>
  );

  function renderStatusBadge(status: ParsedDiffFile['status']) {
    switch (status) {
      case 'added':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-400">
            A
          </span>
        );
      case 'deleted':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-400">
            D
          </span>
        );
      case 'renamed':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-400">
            R
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-400">
            M
          </span>
        );
    }
  }

  function renderUnifiedView(file: ParsedDiffFile) {
    if (file.chunks.length === 0) {
      return <div className="p-4 text-slate-400 text-center">空文件或仅文件权限模式变动</div>;
    }

    return (
      <table className="w-full border-collapse leading-relaxed">
        <tbody>
          {file.chunks.map((chunk, cIdx) => (
            <React.Fragment key={cIdx}>
              {/* Chunk header */}
              <tr className="bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 select-none">
                <td colSpan={3} className="py-1 px-3 text-[11px] font-semibold font-mono">
                  {chunk.header}
                </td>
              </tr>
              {chunk.lines.map((line, lIdx) => {
                let rowBg = '';
                let textCol = 'text-slate-700 dark:text-slate-300';
                let sign = ' ';

                if (line.type === 'add') {
                  rowBg = 'bg-emerald-500/10 dark:bg-emerald-500/15';
                  textCol = 'text-emerald-700 dark:text-emerald-300';
                  sign = '+';
                } else if (line.type === 'del') {
                  rowBg = 'bg-rose-500/10 dark:bg-rose-500/15';
                  textCol = 'text-rose-700 dark:text-rose-300';
                  sign = '-';
                }

                return (
                  <tr key={lIdx} className={`${rowBg} hover:bg-slate-100/50 dark:hover:bg-[#161b22]/50`}>
                    <td className="w-12 text-right px-2 py-0.5 text-[11px] text-slate-400 dark:text-[#6e7681] select-none border-r border-slate-100 dark:border-[#30363d]/50">
                      {line.oldLineNumber ?? ''}
                    </td>
                    <td className="w-12 text-right px-2 py-0.5 text-[11px] text-slate-400 dark:text-[#6e7681] select-none border-r border-slate-100 dark:border-[#30363d]/50">
                      {line.newLineNumber ?? ''}
                    </td>
                    <td className={`px-3 py-0.5 whitespace-pre ${textCol}`}>
                      <span className="inline-block w-3 select-none text-slate-400">{sign}</span>
                      {line.content}
                    </td>
                  </tr>
                );
              })}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    );
  }

  function renderSplitView(file: ParsedDiffFile) {
    return (
      <div className="w-full">
        {file.chunks.map((chunk, cIdx) => (
          <div key={cIdx}>
            <div className="bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 py-1 px-3 text-[11px] font-semibold select-none border-y border-slate-200 dark:border-[#30363d]">
              {chunk.header}
            </div>
            <div className="grid grid-cols-2 divide-x divide-slate-200 dark:divide-[#30363d]">
              {renderSplitRows(chunk.lines)}
            </div>
          </div>
        ))}
      </div>
    );
  }

  function renderSplitRows(lines: DiffLine[]) {
    const rows: { left?: DiffLine; right?: DiffLine }[] = [];
    let i = 0;
    while (i < lines.length) {
      const cur = lines[i];
      if (cur.type === 'context') {
        rows.push({ left: cur, right: cur });
        i++;
      } else if (cur.type === 'del') {
        if (i + 1 < lines.length && lines[i + 1].type === 'add') {
          rows.push({ left: cur, right: lines[i + 1] });
          i += 2;
        } else {
          rows.push({ left: cur, right: undefined });
          i++;
        }
      } else if (cur.type === 'add') {
        rows.push({ left: undefined, right: cur });
        i++;
      }
    }

    return rows.map((row, rIdx) => (
      <React.Fragment key={rIdx}>
        <div
          className={`flex items-start py-0.5 px-2 ${
            row.left?.type === 'del'
              ? 'bg-rose-500/10 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300'
              : 'text-slate-700 dark:text-slate-300'
          }`}
        >
          <span className="w-8 shrink-0 text-right pr-2 text-[11px] text-slate-400 dark:text-[#6e7681] select-none">
            {row.left?.oldLineNumber ?? ''}
          </span>
          <span className="whitespace-pre overflow-x-hidden truncate flex-1">
            {row.left?.content ?? ''}
          </span>
        </div>

        <div
          className={`flex items-start py-0.5 px-2 ${
            row.right?.type === 'add'
              ? 'bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
              : 'text-slate-700 dark:text-slate-300'
          }`}
        >
          <span className="w-8 shrink-0 text-right pr-2 text-[11px] text-slate-400 dark:text-[#6e7681] select-none">
            {row.right?.newLineNumber ?? ''}
          </span>
          <span className="whitespace-pre overflow-x-hidden truncate flex-1">
            {row.right?.content ?? ''}
          </span>
        </div>
      </React.Fragment>
    ));
  }
};

function parseGitPatch(diffText: string): ParsedDiffFile[] {
  const files: ParsedDiffFile[] = [];
  const fileChunks = diffText.split(/^diff --git /m).filter(Boolean);

  for (const chunk of fileChunks) {
    const lines = chunk.split('\n');
    let oldPath = '';
    let newPath = '';
    let status: ParsedDiffFile['status'] = 'modified';
    let isBinary = false;

    const headerMatch = lines[0]?.match(/a\/(.*?)\s+b\/(.*)/);
    if (headerMatch) {
      oldPath = headerMatch[1];
      newPath = headerMatch[2];
    }

    let chunks: DiffChunk[] = [];
    let currentChunk: DiffChunk | null = null;
    let oldLine = 0;
    let newLine = 0;
    let adds = 0;
    let dels = 0;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith('Binary files ') || line.includes('GIT binary patch')) {
        isBinary = true;
        break;
      }

      if (line.startsWith('new file mode')) {
        status = 'added';
      } else if (line.startsWith('deleted file mode')) {
        status = 'deleted';
      } else if (line.startsWith('similarity index') || line.startsWith('rename from')) {
        status = 'renamed';
      }

      if (line.startsWith('@@ ')) {
        const match = line.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@(.*)/);
        if (match) {
          oldLine = parseInt(match[1], 10);
          newLine = parseInt(match[2], 10);
          currentChunk = {
            header: line,
            lines: []
          };
          chunks.push(currentChunk);
        }
        continue;
      }

      if (!currentChunk) continue;

      if (line.startsWith('+')) {
        adds++;
        currentChunk.lines.push({
          type: 'add',
          newLineNumber: newLine++,
          content: line.substring(1)
        });
      } else if (line.startsWith('-')) {
        dels++;
        currentChunk.lines.push({
          type: 'del',
          oldLineNumber: oldLine++,
          content: line.substring(1)
        });
      } else if (line.startsWith(' ') || line === '') {
        currentChunk.lines.push({
          type: 'context',
          oldLineNumber: oldLine++,
          newLineNumber: newLine++,
          content: line.startsWith(' ') ? line.substring(1) : line
        });
      }
    }

    if (newPath || oldPath) {
      files.push({
        oldPath: oldPath || newPath,
        newPath: newPath || oldPath,
        status,
        chunks,
        additions: adds,
        deletions: dels,
        isBinary
      });
    }
  }

  return files;
}
