import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

async function git(repoPath, ...args) {
  await execFileAsync('git', args, {
    cwd: repoPath,
    windowsHide: true,
    encoding: 'utf8'
  });
}

async function gitOutput(repoPath, ...args) {
  const { stdout } = await execFileAsync('git', args, {
    cwd: repoPath,
    windowsHide: true,
    encoding: 'utf8'
  });
  return stdout.trim();
}

async function gitStatus(repoPath) {
  const { stdout } = await execFileAsync('git', ['status', '--porcelain'], {
    cwd: repoPath,
    windowsHide: true,
    encoding: 'utf8'
  });
  return stdout.trimEnd();
}

async function createRepo() {
  const repoPath = await mkdtemp(path.join(os.tmpdir(), 'git-timeline-test-'));
  await git(repoPath, 'init', '-b', 'main');
  await git(repoPath, 'config', 'user.name', 'Git Timeline Test');
  await git(repoPath, 'config', 'user.email', 'test@example.invalid');
  return repoPath;
}

test('isolated repository supports commit, branch deletion, reset and revert', async () => {
  const repoPath = await createRepo();
  try {
    await writeFile(path.join(repoPath, 'note.txt'), 'one\n');
    await git(repoPath, 'add', '--', 'note.txt');
    await git(repoPath, 'commit', '-m', 'first');
    const firstCommit = await gitOutput(repoPath, 'rev-parse', 'HEAD');

    await writeFile(path.join(repoPath, 'note.txt'), 'two\n');
    await git(repoPath, 'commit', '-am', 'second');
    const secondCommit = await gitOutput(repoPath, 'rev-parse', 'HEAD');

    await git(repoPath, 'branch', 'temporary');
    await git(repoPath, 'branch', '-d', '--', 'temporary');
    await assert.rejects(() => git(repoPath, 'rev-parse', '--verify', 'refs/heads/temporary'));

    await git(repoPath, 'reset', '--mixed', firstCommit);
    assert.equal(await gitOutput(repoPath, 'rev-parse', 'HEAD'), firstCommit);
    assert.equal(await gitStatus(repoPath), ' M note.txt');

    await git(repoPath, 'checkout', '--', 'note.txt');
    await git(repoPath, 'reset', '--hard', secondCommit);
    await git(repoPath, 'revert', '--no-edit', secondCommit);
    assert.equal(await gitStatus(repoPath), '');
    assert.equal(await gitOutput(repoPath, 'show', '-s', '--format=%s', 'HEAD'), 'Revert "second"');
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});
