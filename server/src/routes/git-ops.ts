import { Router } from 'express';
import { loadConfig } from '../store/config.js';
import { isValidGitRepo, runGitCommand } from '../git/cli.js';
import { GitStatusResult, GitFileStatus, GitRemoteItem } from '../types.js';

export const gitOpsRouter = Router();

async function getRepoPathById(id: string): Promise<string | null> {
  const config = await loadConfig();
  const repo = config.repositories.find(r => r.id === id);
  if (!repo) return null;
  const valid = await isValidGitRepo(repo.path);
  if (!valid) return null;
  return repo.path;
}

// GET /api/repos/:id/status - Get working tree status
gitOpsRouter.get('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const repoPath = await getRepoPathById(id);
    if (!repoPath) {
      return res.status(404).json({ error: '仓库不存在或路径无效' });
    }

    const output = await runGitCommand(repoPath, ['status', '--porcelain=v1', '-b', '-uall']);
    const lines = output.split(/\r?\n/).filter(Boolean);

    let branch = 'HEAD';
    let ahead = 0;
    let behind = 0;
    const files: GitFileStatus[] = [];

    for (const line of lines) {
      if (line.startsWith('## ')) {
        const branchInfo = line.substring(3);
        const matchBranch = branchInfo.match(/^([^\s.]+)/);
        if (matchBranch) branch = matchBranch[1];

        const aheadMatch = branchInfo.match(/ahead\s+(\d+)/);
        if (aheadMatch) ahead = parseInt(aheadMatch[1], 10);

        const behindMatch = branchInfo.match(/behind\s+(\d+)/);
        if (behindMatch) behind = parseInt(behindMatch[1], 10);
        continue;
      }

      if (line.length >= 3) {
        const x = line[0];
        const y = line[1];
        const filePath = line.substring(3).trim();

        let status: GitFileStatus['status'] = 'modified';
        let staged = false;

        if (x === '?' && y === '?') {
          status = 'untracked';
          staged = false;
        } else {
          staged = x !== ' ' && x !== '?';
          const code = staged ? x : y;
          if (code === 'A') status = 'added';
          else if (code === 'D') status = 'deleted';
          else if (code === 'R') status = 'renamed';
          else status = 'modified';
        }

        files.push({
          path: filePath,
          status,
          staged
        });
      }
    }

    const result: GitStatusResult = {
      branch,
      ahead,
      behind,
      files,
      clean: files.length === 0
    };

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/repos/:id/commit - Stage & Commit changes
gitOpsRouter.post('/:id/commit', async (req, res) => {
  try {
    const { id } = req.params;
    const repoPath = await getRepoPathById(id);
    if (!repoPath) {
      return res.status(404).json({ error: '仓库不存在或路径无效' });
    }

    const { message, files, push } = req.body;
    const cleanMessage = String(message || '').trim();
    if (!cleanMessage) {
      return res.status(400).json({ error: '提交说明不能为空' });
    }

    if (Array.isArray(files) && files.length > 0) {
      await runGitCommand(repoPath, ['add', '--', ...files]);
    } else if (!files) {
      await runGitCommand(repoPath, ['add', '-A']);
    }

    const commitOut = await runGitCommand(repoPath, ['commit', '-m', cleanMessage]);
    const hashOut = await runGitCommand(repoPath, ['rev-parse', '--short', 'HEAD']);
    const commitHash = hashOut.trim();

    let pushOutput: string | undefined;
    if (push) {
      try {
        pushOutput = await runGitCommand(repoPath, ['push']);
      } catch {
        const branchOut = await runGitCommand(repoPath, ['branch', '--show-current']);
        const currentBranch = branchOut.trim() || 'master';
        pushOutput = await runGitCommand(repoPath, ['push', '-u', 'origin', currentBranch]);
      }
    }

    res.json({
      success: true,
      commitHash,
      message: cleanMessage,
      output: commitOut,
      pushOutput
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/repos/:id/pull - Git Pull
gitOpsRouter.post('/:id/pull', async (req, res) => {
  try {
    const { id } = req.params;
    const repoPath = await getRepoPathById(id);
    if (!repoPath) {
      return res.status(404).json({ error: '仓库不存在或路径无效' });
    }

    const output = await runGitCommand(repoPath, ['pull']);
    res.json({ success: true, output });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/repos/:id/push - Git Push
gitOpsRouter.post('/:id/push', async (req, res) => {
  try {
    const { id } = req.params;
    const repoPath = await getRepoPathById(id);
    if (!repoPath) {
      return res.status(404).json({ error: '仓库不存在或路径无效' });
    }

    let output: string;
    try {
      output = await runGitCommand(repoPath, ['push']);
    } catch {
      const branchOut = await runGitCommand(repoPath, ['branch', '--show-current']);
      const currentBranch = branchOut.trim() || 'master';
      output = await runGitCommand(repoPath, ['push', '-u', 'origin', currentBranch]);
    }

    res.json({ success: true, output });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/repos/:id/remotes - Get remote origins
gitOpsRouter.get('/:id/remotes', async (req, res) => {
  try {
    const { id } = req.params;
    const repoPath = await getRepoPathById(id);
    if (!repoPath) {
      return res.status(404).json({ error: '仓库不存在或路径无效' });
    }

    const output = await runGitCommand(repoPath, ['remote', '-v']);
    const lines = output.split(/\r?\n/).filter(Boolean);
    const remoteMap = new Map<string, { fetchUrl: string; pushUrl: string }>();

    for (const line of lines) {
      const match = line.match(/^([^\t\s]+)\s+([^\s]+)\s+\((fetch|push)\)$/);
      if (match) {
        const [, name, url, type] = match;
        const entry = remoteMap.get(name) || { fetchUrl: '', pushUrl: '' };
        if (type === 'fetch') entry.fetchUrl = url;
        if (type === 'push') entry.pushUrl = url;
        remoteMap.set(name, entry);
      }
    }

    const remotes: GitRemoteItem[] = [];
    for (const [name, urls] of remoteMap.entries()) {
      const targetUrl = urls.pushUrl || urls.fetchUrl;
      const isGitHub = /github\.com/i.test(targetUrl);
      let githubRepo: string | undefined;

      if (isGitHub) {
        const ghMatch = targetUrl.match(/github\.com[:/]([^/]+\/[^/.]+)(\.git)?/i);
        if (ghMatch) githubRepo = ghMatch[1];
      }

      remotes.push({
        name,
        fetchUrl: urls.fetchUrl,
        pushUrl: urls.pushUrl,
        isGitHub,
        githubRepo
      });
    }

    res.json({ remotes });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/repos/:id/publish-github - Publish to GitHub
gitOpsRouter.post('/:id/publish-github', async (req, res) => {
  try {
    const { id } = req.params;
    const repoPath = await getRepoPathById(id);
    if (!repoPath) {
      return res.status(404).json({ error: '仓库不存在或路径无效' });
    }

    const { remoteUrl } = req.body;
    const cleanUrl = String(remoteUrl || '').trim();
    if (!cleanUrl) {
      return res.status(400).json({ error: 'GitHub 仓库远程地址不能为空' });
    }

    // Check existing remotes
    const remotesOut = await runGitCommand(repoPath, ['remote']);
    const remotesList = remotesOut.split(/\r?\n/).map(r => r.trim()).filter(Boolean);

    if (remotesList.includes('origin')) {
      await runGitCommand(repoPath, ['remote', 'set-url', 'origin', cleanUrl]);
    } else {
      await runGitCommand(repoPath, ['remote', 'add', 'origin', cleanUrl]);
    }

    const branchOut = await runGitCommand(repoPath, ['branch', '--show-current']);
    const currentBranch = branchOut.trim() || 'master';

    const pushOutput = await runGitCommand(repoPath, ['push', '-u', 'origin', currentBranch]);

    let githubWebUrl: string | undefined;
    const ghMatch = cleanUrl.match(/github\.com[:/]([^/]+\/[^/.]+)(\.git)?/i);
    if (ghMatch) {
      githubWebUrl = `https://github.com/${ghMatch[1]}`;
    }

    res.json({
      success: true,
      remoteUrl: cleanUrl,
      currentBranch,
      githubUrl: githubWebUrl,
      output: pushOutput
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/repos/:id/branches - Create new branch
gitOpsRouter.post('/:id/branches', async (req, res) => {
  try {
    const { id } = req.params;
    const repoPath = await getRepoPathById(id);
    if (!repoPath) {
      return res.status(404).json({ error: '仓库不存在或路径无效' });
    }

    const { name, checkout = true } = req.body;
    const branchName = String(name || '').trim();
    if (!branchName) {
      return res.status(400).json({ error: '分支名称不能为空' });
    }

    if (checkout) {
      await runGitCommand(repoPath, ['checkout', '-b', branchName]);
    } else {
      await runGitCommand(repoPath, ['branch', branchName]);
    }

    res.json({ success: true, branchName });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/repos/:id/tags - Create new tag
gitOpsRouter.post('/:id/tags', async (req, res) => {
  try {
    const { id } = req.params;
    const repoPath = await getRepoPathById(id);
    if (!repoPath) {
      return res.status(404).json({ error: '仓库不存在或路径无效' });
    }

    const { name, message } = req.body;
    const tagName = String(name || '').trim();
    if (!tagName) {
      return res.status(400).json({ error: '标签名称不能为空' });
    }

    if (message && String(message).trim()) {
      await runGitCommand(repoPath, ['tag', '-a', tagName, '-m', String(message).trim()]);
    } else {
      await runGitCommand(repoPath, ['tag', tagName]);
    }

    res.json({ success: true, tagName });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/repos/:id/stash - Stash / Pop workspace
gitOpsRouter.post('/:id/stash', async (req, res) => {
  try {
    const { id } = req.params;
    const repoPath = await getRepoPathById(id);
    if (!repoPath) {
      return res.status(404).json({ error: '仓库不存在或路径无效' });
    }

    const { action = 'stash', message } = req.body;
    let output: string;

    if (action === 'pop') {
      output = await runGitCommand(repoPath, ['stash', 'pop']);
    } else {
      const msg = message ? String(message).trim() : 'Git Timeline Stash';
      output = await runGitCommand(repoPath, ['stash', 'push', '-m', msg]);
    }

    res.json({ success: true, action, output });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
