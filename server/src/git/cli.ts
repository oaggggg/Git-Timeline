import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';

const execFileAsync = promisify(execFile);

export async function runGitCommand(repoPath: string, args: string[]): Promise<string> {
  try {
    const { stdout } = await execFileAsync('git', args, {
      cwd: repoPath,
      maxBuffer: 50 * 1024 * 1024, // 50MB
      windowsHide: true,
      encoding: 'utf-8'
    });
    return stdout;
  } catch (err: any) {
    if (err.stdout) {
      // Sometimes git returns non-zero on diff status or warnings but still has stdout
      return err.stdout;
    }
    const errorMsg = err.stderr || err.message || String(err);
    throw new Error(`Git error [${args.join(' ')}]: ${errorMsg}`);
  }
}

export async function isValidGitRepo(targetPath: string): Promise<boolean> {
  try {
    const gitDir = path.join(targetPath, '.git');
    const stat = await fs.stat(gitDir);
    return stat.isDirectory() || stat.isFile(); // bare or worktree or standard repo
  } catch {
    return false;
  }
}
