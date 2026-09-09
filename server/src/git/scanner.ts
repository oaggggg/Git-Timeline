import fs from 'fs/promises';
import path from 'path';
import { isValidGitRepo } from './cli.js';

const IGNORED_FOLDERS = new Set([
  'node_modules',
  '.git',
  '.svn',
  '.hg',
  'dist',
  'build',
  'out',
  'target',
  'bin',
  'obj',
  '.vscode',
  '.idea',
  'venv',
  '.venv',
  'vendor'
]);

export async function scanForGitRepos(
  rootDir: string,
  maxDepth = 3
): Promise<{ path: string; name: string }[]> {
  const results: { path: string; name: string }[] = [];

  async function walk(currentDir: string, currentDepth: number) {
    if (currentDepth > maxDepth) return;

    // Check if currentDir itself is a git repo
    const isRepo = await isValidGitRepo(currentDir);
    if (isRepo) {
      results.push({
        path: path.resolve(currentDir),
        name: path.basename(path.resolve(currentDir))
      });
      // Don't recurse inside a git repo
      return;
    }

    try {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          if (IGNORED_FOLDERS.has(entry.name) || entry.name.startsWith('.')) {
            continue;
          }
          const subPath = path.join(currentDir, entry.name);
          await walk(subPath, currentDepth + 1);
        }
      }
    } catch {
      // Ignore permission denied or unreadable folders
    }
  }

  await walk(rootDir, 0);
  return results;
}
