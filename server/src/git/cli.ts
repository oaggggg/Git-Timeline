import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';

const execFileAsync = promisify(execFile);

const isNetworkCommand = (args: string[]) =>
  ['fetch', 'pull', 'push', 'ls-remote', 'clone'].includes(args[0]);

const isProxyConnectionError = (error: any) =>
  /(?:could not connect to|failed to connect to).*proxy|proxy .*?(?:refused|unavailable)|connection (?:refused|timed out).*127\.0\.0\.1/i
    .test(String(error?.stderr || error?.message || error || ''));

export async function runGitCommand(repoPath: string, args: string[]): Promise<string> {
  const finalArgs = [
    '-c', 'core.quotepath=false',
    '-c', 'log.showSignature=false',
    '-c', 'i18n.logOutputEncoding=utf-8',
    ...args
  ];

  const execute = (commandArgs: string[]) => execFileAsync('git', commandArgs, {
    cwd: repoPath,
    maxBuffer: 50 * 1024 * 1024, // 50MB buffer
    timeout: 30_000,
    killSignal: 'SIGTERM',
    windowsHide: true,
    encoding: 'utf-8'
  });

  try {
    const { stdout } = await execute(finalArgs);
    return stdout;
  } catch (err: any) {
    // A VPN may provide direct access while a stale local proxy remains configured.
    if (isNetworkCommand(args) && isProxyConnectionError(err)) {
      try {
        const directArgs = [
          '-c', 'http.proxy=',
          '-c', 'https.proxy=',
          ...finalArgs
        ];
        const { stdout } = await execute(directArgs);
        return stdout;
      } catch (directErr: any) {
        err = directErr;
      }
    }
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
