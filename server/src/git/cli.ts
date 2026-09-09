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
      windowsHide: true,
      encoding: 'utf-8'
    });
    return stdout;
  } catch (err: any) {
    if (err.stdout) {
      // Some git commands exit with code 1 on diff differences or warnings but output valid data
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
    return stat.isDirectory() || stat.isFile();
  } catch {
    return false;
  }
}
