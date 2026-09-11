import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
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

test('isolated repository keeps staged and unstaged changes distinct', async () => {
  const repoPath = await createRepo();
  try {
    await writeFile(path.join(repoPath, 'note.txt'), 'base\n');
    await git(repoPath, 'add', '--', 'note.txt');
    await git(repoPath, 'commit', '-m', 'base');

    await writeFile(path.join(repoPath, 'note.txt'), 'staged\n');
    await git(repoPath, 'add', '--', 'note.txt');
    await writeFile(path.join(repoPath, 'note.txt'), 'unstaged\n');

    const stagedDiff = await gitOutput(repoPath, 'diff', '--cached', '--');
    const unstagedDiff = await gitOutput(repoPath, 'diff', '--');
    assert.match(stagedDiff, /-base\s+\+staged/);
    assert.match(unstagedDiff, /-staged\s+\+unstaged/);

    await git(repoPath, 'reset', 'HEAD', '--', 'note.txt');
    assert.equal(await gitStatus(repoPath), ' M note.txt');
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
});

test('upstream commit counts distinguish synced and ahead states', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'git-timeline-sync-'));
  const repoPath = path.join(root, 'repo');
  const remotePath = path.join(root, 'remote.git');
  try {
    await execFileAsync('git', ['init', '--bare', remotePath], { windowsHide: true });
    await mkdir(repoPath);
    await git(repoPath, 'init', '-b', 'main');
    await git(repoPath, 'config', 'user.name', 'Git Timeline Test');
    await git(repoPath, 'config', 'user.email', 'test@example.invalid');
    await git(repoPath, 'remote', 'add', 'origin', remotePath);
    await writeFile(path.join(repoPath, 'note.txt'), 'one\n');
    await git(repoPath, 'add', '--', 'note.txt');
    await git(repoPath, 'commit', '-m', 'first');
    await git(repoPath, 'push', '--set-upstream', 'origin', 'main');

    const synced = await gitOutput(repoPath, 'rev-list', '--left-right', '--count', '@{upstream}...HEAD');
    assert.equal(synced, '0\t0');

    await writeFile(path.join(repoPath, 'note.txt'), 'two\n');
    await git(repoPath, 'commit', '-am', 'local');
    const ahead = await gitOutput(repoPath, 'rev-list', '--left-right', '--count', '@{upstream}...HEAD');
    assert.equal(ahead, '0\t1');

    const peer = path.join(root, 'peer');
    await git(root, 'clone', remotePath, peer);
    await git(peer, 'config', 'user.name', 'Git Timeline Peer');
    await git(peer, 'config', 'user.email', 'peer@example.invalid');
    await writeFile(path.join(peer, 'peer.txt'), 'remote\n');
    await git(peer, 'add', '--', 'peer.txt');
    await git(peer, 'commit', '-m', 'remote');
    await git(peer, 'push');
    await git(repoPath, 'fetch', 'origin', 'main:refs/remotes/origin/main');
    const afterFetch = await gitOutput(repoPath, 'rev-list', '--left-right', '--count', '@{upstream}...HEAD');
    assert.equal(afterFetch, '0\t1');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
