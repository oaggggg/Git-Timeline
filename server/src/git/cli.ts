import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';

const execFileAsync = promisify(execFile);

export async function runGitCommand(repoPath: string, args: string[]): Promise<string> {
  try {
    // Inject git config flags to ensure UTF-8 paths are not octal-escaped,
    // and skip gpg signature verification delays
    const finalArgs = [
      '-c', 'core.quotepath=false',
      '-c', 'log.showSignature=false',
      '-c', 'i18n.logOutputEncoding=utf-8',
      ...args
    ];

    const { stdout } = await execFileAsync('git', finalArgs, {
      cwd: repoPath,
      maxBuffer: 50 * 1024 * 1024, // 50MB buffer
      timeout: 30_000,
      killSignal: 'SIGTERM',
      windowsHide: true,
      encoding: 'utf-8'
    });
    return stdout;
  } catch (err: any) {
    const errorMsg = err.killed && err.signal
      ? `命令执行超时（${err.signal}）`
      : err.stderr || err.message || String(err);
    throw new Error(`Git error [${args.join(' ')}]: ${errorMsg}`);
  }
}

export async function isValidGitRepo(targetPath: string): Promise<boolean> {
  try {
    const gitDir = path.join(targetPath, '.git');
    const stat = await fs.stat(gitDir);
    return stat.isDirectory() || stat.isFile();
  } catch {
    return false;
  }
}
