import { Router } from 'express';
import { loadConfig } from '../store/config.js';
import { isValidGitRepo, runGitCommand } from '../git/cli.js';
import { 
  GitStatusResult, 
  GitFileStatus, 
  GitRemoteItem, 
  PullRequestInfo, 
  CreatePrRequest, 
  CreatePrResponse 
} from '../types.js';

export const gitOpsRouter = Router();

export function isCommitHash(value: string): boolean {
  return /^[0-9a-f]{4,40}$/i.test(value);
}

export function parseGitError(err: any): { code: string; message: string } {
  const raw = String(err?.message || err || '');

  if (/could not resolve proxy|failed to connect to (?:127\.0\.0\.1|localhost|\[?::1\]?)\b|failed to connect to [^\r\n]+ or proxy (?:127\.0\.0\.1|localhost|\[?::1\]?)/i.test(raw)) {
    return {
      code: 'PROXY_UNAVAILABLE',
      message: '无法连接 Git 代理。请确认代理软件已启动、代理端口与 Git 配置一致，再重试此操作。'
    };
  }

  if (/could not resolve host|failed to connect|could(?:n't| not) connect to server|connection (?:timed out|refused|reset)|operation timed out|network is unreachable/i.test(raw)) {
    return {
      code: 'NETWORK_UNAVAILABLE',
      message: '无法连接远程仓库。请检查网络与代理设置，连接恢复后重试。'
    };
  }

  if (/does not appear to be a git repository|No remote repository specified/i.test(raw)) {
    return {
      code: 'NO_REMOTE',
      message: '未检测到有效的远程仓库地址，请先使用「发布到 GitHub」进行关联或配置正确的远程仓库。'
    };
  }

  if (/There is no tracking information for the current branch/i.test(raw)) {
    return {
      code: 'NO_TRACKING',
      message: '当前分支尚未设置远程追踪分支。请先执行「推送 (Push)」将分支发布并绑定到远程。'
    };
  }

  if (/Permission denied|Authentication failed|Could not read from remote repository/i.test(raw)) {
    return {
      code: 'AUTH_FAILED',
      message: '远程仓库访问失败，请检查网络连接、GitHub 访问权限或 SSH Key / Personal Access Token。'
    };
  }

  if (/no such ref was fetched|merge with the ref|couldn't find remote ref/i.test(raw)) {
    return {
      code: 'NO_REMOTE_REF',
      message: '远程仓库尚未存在该分支（可能远程分支为 main 或尚未推送该分支），建议先执行「推送」将当前分支发布到远程。'
    };
  }

  if (/Updates were rejected because the remote contains work/i.test(raw)) {
    return {
      code: 'REJECTED_NON_FAST_FORWARD',
      message: '推送被拒绝：远程存在本地未拉取的更新，请先点击「拉取」合并最新提交后再推送。'
    };
  }

  if (/Automatic merge failed|fix conflicts and then commit/i.test(raw)) {
    return {
      code: 'CONFLICT',
      message: '拉取合并存在代码冲突，请在本地编辑器中解决冲突文件后再提交。'
    };
  }

  const cleaned = raw.replace(/^Git error \[[^\]]+\]:\s*/, '').trim();
  return {
    code: 'GIT_ERROR',
    message: cleaned || 'Git 操作失败'
  };
}

async function getRepoRemotes(repoPath: string): Promise<GitRemoteItem[]> {
  const output = await runGitCommand(repoPath, ['remote', '-v']).catch(() => '');
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
  return remotes;
}

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
      const branchOut = await runGitCommand(repoPath, ['branch', '--show-current']);
      const currentBranch = branchOut.trim();
      if (!currentBranch) {
        return res.status(400).json({
          code: 'DETACHED_HEAD',
          error: '当前处于 detached HEAD 状态，请先切换到一个本地分支后再推送。'
        });
      }
      const remotes = await getRepoRemotes(repoPath);
      if (remotes.length === 0) {
        return res.status(400).json({
          code: 'NO_REMOTE',
          error: '提交已保存在本地，但当前仓库没有配置远程仓库。'
        });
      }
      const targetRemote = remotes.some(remote => remote.name === 'origin')
        ? 'origin'
        : remotes[0].name;
      pushOutput = await runGitCommand(repoPath, [
        'push', '--set-upstream', targetRemote, currentBranch
      ]);
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

    const remotes = await getRepoRemotes(repoPath);
    if (remotes.length === 0) {
      return res.status(400).json({
        code: 'NO_REMOTE',
        error: '当前仓库尚未配置远程仓库 (Remote)。请先点击顶部「发布到 GitHub」关联远程代码库。'
      });
    }

    let output: string;
    try {
      output = await runGitCommand(repoPath, ['pull']);
    } catch (pullErr: any) {
      const raw = String(pullErr.message || '');
      if (/no tracking information/i.test(raw)) {
        const branchOut = await runGitCommand(repoPath, ['branch', '--show-current']).catch(() => '');
        const currentBranch = branchOut.trim() || 'master';
        const hasOrigin = remotes.some(r => r.name === 'origin');
        const targetRemote = hasOrigin ? 'origin' : remotes[0].name;

        try {
          output = await runGitCommand(repoPath, ['pull', targetRemote, currentBranch]);
        } catch (retryErr) {
          const parsed = parseGitError(retryErr);
          return res.status(400).json({ code: parsed.code, error: parsed.message });
        }
      } else {
        const parsed = parseGitError(pullErr);
        return res.status(400).json({ code: parsed.code, error: parsed.message });
      }
    }

    res.json({ success: true, output });
  } catch (err: any) {
    const parsed = parseGitError(err);
    res.status(500).json({ code: parsed.code, error: parsed.message });
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

    const remotes = await getRepoRemotes(repoPath);
    if (remotes.length === 0) {
      return res.status(400).json({
        code: 'NO_REMOTE',
        error: '当前仓库尚未配置远程仓库 (Remote)。请先点击顶部「发布到 GitHub」关联远程代码库。'
      });
    }

    const branchOut = await runGitCommand(repoPath, ['branch', '--show-current']).catch(() => '');
    const currentBranch = branchOut.trim();
    if (!currentBranch) {
      return res.status(400).json({
        code: 'DETACHED_HEAD',
        error: '当前处于 detached HEAD 状态，请先切换到一个本地分支后再推送。'
      });
    }

    const hasOrigin = remotes.some(r => r.name === 'origin');
    const targetRemote = hasOrigin ? 'origin' : remotes[0].name;
    let output: string;
    try {
      // Always name the remote and branch so first-time pushes establish tracking.
      output = await runGitCommand(repoPath, ['push', '--set-upstream', targetRemote, currentBranch]);
    } catch (pushErr: any) {
      const parsed = parseGitError(pushErr);
      return res.status(400).json({ code: parsed.code, error: parsed.message });
    }

    const remoteHead = await runGitCommand(repoPath, [
      'ls-remote', '--heads', targetRemote, currentBranch
    ]).catch(() => '');
    const localHead = await runGitCommand(repoPath, ['rev-parse', 'HEAD']);
    const remoteHeadHash = remoteHead.trim().split(/\s+/)[0];
    if (!remoteHeadHash || remoteHeadHash !== localHead.trim()) {
      return res.status(502).json({
        code: 'PUSH_NOT_VERIFIED',
        error: '推送命令已返回，但无法确认远程分支已更新，请稍后刷新后重试。',
        output
      });
    }

    res.json({ success: true, output, remote: targetRemote, branch: currentBranch });
  } catch (err: any) {
    const parsed = parseGitError(err);
    res.status(500).json({ code: parsed.code, error: parsed.message });
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

    const remotes = await getRepoRemotes(repoPath);
    res.json({ remotes });
  } catch (err: any) {
    const parsed = parseGitError(err);
    res.status(500).json({ code: parsed.code, error: parsed.message });
  }
});

// GET /api/repos/:id/pr-info - Get PR pre-fill info
gitOpsRouter.get('/:id/pr-info', async (req, res) => {
  try {
    const { id } = req.params;
    const repoPath = await getRepoPathById(id);
    if (!repoPath) {
      return res.status(404).json({ error: '仓库不存在或路径无效' });
    }

    const remotes = await getRepoRemotes(repoPath);
    const githubRemote = remotes.find(r => r.isGitHub && r.githubRepo) || remotes[0];
    const githubRepo = githubRemote?.githubRepo;
    const githubUrl = githubRepo ? `https://github.com/${githubRepo}` : undefined;

    // Current branch
    const branchOut = await runGitCommand(repoPath, ['branch', '--show-current']).catch(() => '');
    const currentBranch = branchOut.trim() || 'master';

    // Branches
    const branchesOut = await runGitCommand(repoPath, ['branch', '-a', '--format=%(refname:short)']).catch(() => '');
    const rawBranches = branchesOut.split(/\r?\n/).map(b => b.trim()).filter(Boolean);
    const branchSet = new Set<string>();
    for (const b of rawBranches) {
      const clean = b.replace(/^(remotes\/)?[^/]+\//, '').trim();
      const isRemoteName = remotes.some(r => r.name === b || r.name === clean);
      if (clean && !clean.includes('HEAD') && clean !== 'origin' && !isRemoteName) {
        branchSet.add(clean);
      }
    }
    const branches = Array.from(branchSet);

    // Default base branch
    let defaultBaseBranch = 'main';
    if (branches.includes('master') && !branches.includes('main')) {
      defaultBaseBranch = 'master';
    } else if (branches.includes('main')) {
      defaultBaseBranch = 'main';
    } else if (branches.length > 0) {
      defaultBaseBranch = branches.find(b => b !== currentBranch) || branches[0];
    }

    // Ahead count
    let ahead = 0;
    try {
      const statusOut = await runGitCommand(repoPath, ['status', '-sb']);
      const aheadMatch = statusOut.match(/ahead\s+(\d+)/);
      if (aheadMatch) ahead = parseInt(aheadMatch[1], 10);
    } catch {}

    // Latest commit subject
    let latestCommitSubject = '';
    try {
      const logOut = await runGitCommand(repoPath, ['log', '-1', '--pretty=format:%s']);
      latestCommitSubject = logOut.trim();
    } catch {}

    // Recent commits
    const recentCommits: string[] = [];
    try {
      const recentOut = await runGitCommand(repoPath, ['log', '-5', '--pretty=format:%s']);
      recentCommits.push(...recentOut.split(/\r?\n/).map(s => s.trim()).filter(Boolean));
    } catch {}

    const result: PullRequestInfo = {
      currentBranch,
      defaultBaseBranch,
      branches,
      githubRepo,
      githubUrl,
      hasGitHubRemote: Boolean(githubRepo),
      ahead,
      latestCommitSubject,
      recentCommits
    };

    res.json(result);
  } catch (err: any) {
    const parsed = parseGitError(err);
    res.status(500).json({ code: parsed.code, error: parsed.message });
  }
});

// POST /api/repos/:id/pr - Create Pull Request or get compare link
gitOpsRouter.post('/:id/pr', async (req, res) => {
  try {
    const { id } = req.params;
    const repoPath = await getRepoPathById(id);
    if (!repoPath) {
      return res.status(404).json({ error: '仓库不存在或路径无效' });
    }

    const { title, body, head, base, token } = req.body as CreatePrRequest;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'PR 标题不能为空' });
    }
    if (!head || !base) {
      return res.status(400).json({ error: '源分支与目标分支不能为空' });
    }
    if (head === base) {
      return res.status(400).json({ error: '源分支与目标分支不能相同' });
    }

    const remotes = await getRepoRemotes(repoPath);
    const githubRemote = remotes.find(r => r.isGitHub && r.githubRepo);
    if (!githubRemote || !githubRemote.githubRepo) {
      return res.status(400).json({
        code: 'NO_GITHUB_REMOTE',
        error: '当前仓库尚未关联 GitHub 远程仓库，请先点击顶部「发布到 GitHub」进行配置。'
      });
    }

    const githubRepo = githubRemote.githubRepo;
    const compareUrl = `https://github.com/${githubRepo}/compare/${encodeURIComponent(base)}...${encodeURIComponent(head)}?expand=1&title=${encodeURIComponent(title.trim())}&body=${encodeURIComponent(body?.trim() || '')}`;

    let prResult: CreatePrResponse['pr'] | undefined;

    if (token && token.trim()) {
      try {
        const ghRes = await fetch(`https://api.github.com/repos/${githubRepo}/pulls`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token.trim()}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Git-Timeline-Viewer',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            title: title.trim(),
            head: head.trim(),
            base: base.trim(),
            body: body?.trim() || ''
          })
        });

        const ghData: any = await ghRes.json();
        if (!ghRes.ok) {
          const errMsg = ghData.errors?.map((e: any) => e.message).join(', ') || ghData.message || 'GitHub 接口创建 PR 失败';
          return res.status(ghRes.status).json({
            code: 'GITHUB_API_ERROR',
            error: `GitHub 接口反馈: ${errMsg}`,
            compareUrl
          });
        }

        prResult = {
          id: ghData.id,
          number: ghData.number,
          html_url: ghData.html_url,
          title: ghData.title,
          state: ghData.state
        };
      } catch (apiErr: any) {
        return res.status(500).json({
          code: 'GITHUB_API_FETCH_ERROR',
          error: `请求 GitHub 失败: ${apiErr.message}`,
          compareUrl
        });
      }
    }

    const responseData: CreatePrResponse = {
      success: true,
      compareUrl,
      pr: prResult
    };

    res.json(responseData);
  } catch (err: any) {
    const parsed = parseGitError(err);
    res.status(500).json({ code: parsed.code, error: parsed.message });
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

    const { name, checkout = true, startPoint } = req.body;
    const branchName = String(name || '').trim();
    if (!branchName) {
      return res.status(400).json({ error: '分支名称不能为空' });
    }

    const args = checkout
      ? ['checkout', '-b', branchName]
      : ['branch', branchName];

    if (startPoint && String(startPoint).trim()) {
      args.push(String(startPoint).trim());
    }

    await runGitCommand(repoPath, args);

    res.json({ success: true, branchName });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/repos/:id/branches/:branchName - Delete branch
gitOpsRouter.delete('/:id/branches/:branchName', async (req, res) => {
  try {
    const { id, branchName } = req.params;
    const force = req.query.force === 'true';
    const repoPath = await getRepoPathById(id);
    if (!repoPath) {
      return res.status(404).json({ error: '仓库不存在或路径无效' });
    }

    const cleanBranch = decodeURIComponent(String(branchName || '')).trim();
    if (!cleanBranch) {
      return res.status(400).json({ error: '分支名称不能为空' });
    }

    // Check if branch is current checked out branch
    const currentBranchOutput = await runGitCommand(repoPath, ['branch', '--show-current']).catch(() => '');
    if (currentBranchOutput.trim() === cleanBranch) {
      return res.status(400).json({ error: '不能删除当前正在工作的活跃分支，请先切换至其他分支' });
    }

    // Delete local branch: -d for safe, -D for force
    const deleteArgs = ['branch', force ? '-D' : '-d', '--', cleanBranch];
    await runGitCommand(repoPath, deleteArgs);

    res.json({ success: true, branchName: cleanBranch, force });
  } catch (err: any) {
    const parsed = parseGitError(err);
    const isUnmerged = /not fully merged/i.test(err?.message || '');
    res.status(500).json({ 
      error: parsed.message || err.message, 
      isUnmerged,
      canForce: isUnmerged
    });
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

// POST /api/repos/:id/reset - Reset branch to target commit (soft, mixed, hard)
gitOpsRouter.post('/:id/reset', async (req, res) => {
  try {
    const { id } = req.params;
    const repoPath = await getRepoPathById(id);
    if (!repoPath) {
      return res.status(404).json({ error: '仓库不存在或路径无效' });
    }

    const { commitHash, mode = 'mixed' } = req.body;
    const targetHash = String(commitHash || '').trim();
    if (!targetHash) {
      return res.status(400).json({ error: '目标提交 Hash 不能为空' });
    }
    if (!isCommitHash(targetHash)) {
      return res.status(400).json({ error: '目标提交 Hash 格式无效' });
    }

    const validModes = ['soft', 'mixed', 'hard'] as const;
    if (!validModes.includes(mode)) {
      return res.status(400).json({ error: '无效的回退模式，必须是 soft、mixed 或 hard' });
    }
    const resetMode = mode;

    const output = await runGitCommand(repoPath, ['reset', `--${resetMode}`, targetHash]);

    res.json({
      success: true,
      mode: resetMode,
      commitHash: targetHash,
      output: output || '回退成功'
    });
  } catch (err: any) {
    const parsed = parseGitError(err);
    res.status(500).json({ code: parsed.code, error: parsed.message });
  }
});

// POST /api/repos/:id/revert - Revert target commit
gitOpsRouter.post('/:id/revert', async (req, res) => {
  try {
    const { id } = req.params;
    const repoPath = await getRepoPathById(id);
    if (!repoPath) {
      return res.status(404).json({ error: '仓库不存在或路径无效' });
    }

    const { commitHash } = req.body;
    const targetHash = String(commitHash || '').trim();
    if (!targetHash) {
      return res.status(400).json({ error: '目标提交 Hash 不能为空' });
    }
    if (!isCommitHash(targetHash)) {
      return res.status(400).json({ error: '目标提交 Hash 格式无效' });
    }

    const output = await runGitCommand(repoPath, ['revert', '--no-edit', targetHash]);

    res.json({
      success: true,
      commitHash: targetHash,
      output: output || '反转提交成功'
    });
  } catch (err: any) {
    const parsed = parseGitError(err);
    res.status(500).json({ code: parsed.code, error: parsed.message });
  }
});

// POST /api/repos/:id/undo-commit - Undo last commit (git reset --soft HEAD~1)
gitOpsRouter.post('/:id/undo-commit', async (req, res) => {
  try {
    const { id } = req.params;
    const repoPath = await getRepoPathById(id);
    if (!repoPath) {
      return res.status(404).json({ error: '仓库不存在或路径无效' });
    }

    const output = await runGitCommand(repoPath, ['reset', '--soft', 'HEAD~1']);

    res.json({
      success: true,
      message: '已成功撤回最后一次提交，代码修改已完整保留在暂存区',
      output
    });
  } catch (err: any) {
    const parsed = parseGitError(err);
    res.status(500).json({ code: parsed.code, error: parsed.message });
  }
});

// POST /api/repos/:id/discard-changes - Discard all uncommitted changes in working directory
gitOpsRouter.post('/:id/discard-changes', async (req, res) => {
  try {
    const { id } = req.params;
    const repoPath = await getRepoPathById(id);
    if (!repoPath) {
      return res.status(404).json({ error: '仓库不存在或路径无效' });
    }

    // Reset staging & discard tracked changes
    await runGitCommand(repoPath, ['reset', 'HEAD']);
    await runGitCommand(repoPath, ['checkout', '--', '.']);
    // Clean untracked files and directories
    await runGitCommand(repoPath, ['clean', '-fd']).catch(() => '');

    res.json({
      success: true,
      message: '已成功撤销工作区所有未提交变动'
    });
  } catch (err: any) {
    const parsed = parseGitError(err);
    res.status(500).json({ code: parsed.code, error: parsed.message });
  }
});
