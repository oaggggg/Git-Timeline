import { Router } from 'express';
import path from 'path';
import { loadConfig, saveConfig, generateRepoId } from '../store/config.js';
import { isValidGitRepo, runGitCommand } from '../git/cli.js';
import { scanForGitRepos } from '../git/scanner.js';
import { openFolderDialog } from '../utils/dialog.js';
import { RepoInfo } from '../types.js';

export const reposRouter = Router();

// GET /api/repos - Get all registered repositories
reposRouter.get('/', async (req, res) => {
  try {
    const config = await loadConfig();
    const updatedRepos: RepoInfo[] = [];

    for (const repo of config.repositories) {
      const isValid = await isValidGitRepo(repo.path);
      if (!isValid) {
        updatedRepos.push({
          ...repo,
          currentBranch: 'unavailable'
        });
        continue;
      }

      try {
        const branchOut = await runGitCommand(repo.path, ['branch', '--show-current']);
        const currentBranch = branchOut.trim() || 'HEAD (detached)';

        const lastCommitOut = await runGitCommand(repo.path, ['log', '-1', '--format=%aI']);
        const lastCommitDate = lastCommitOut.trim();

        updatedRepos.push({
          ...repo,
          currentBranch,
          lastCommitDate: lastCommitDate || undefined
        });
      } catch {
        updatedRepos.push(repo);
      }
    }

    config.repositories = updatedRepos;
    res.json({
      repositories: updatedRepos,
      activeRepoId: config.activeRepoId
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/repos - Add a repository by local path
reposRouter.post('/', async (req, res) => {
  try {
    const { repoPath, name } = req.body;
    if (!repoPath) {
      return res.status(400).json({ error: 'repoPath is required' });
    }

    const resolved = path.resolve(repoPath);
    const valid = await isValidGitRepo(resolved);
    if (!valid) {
      return res.status(400).json({ error: `Not a valid Git repository: ${resolved}` });
    }

    const config = await loadConfig();
    const id = generateRepoId(resolved);

    // Check if already exists
    const existing = config.repositories.find(r => r.id === id);
    if (existing) {
      config.activeRepoId = id;
      await saveConfig(config);
      return res.json({ repo: existing, activeRepoId: id });
    }

    const repoName = name || path.basename(resolved);
    let currentBranch = 'main';
    let lastCommitDate: string | undefined;

    try {
      const branchOut = await runGitCommand(resolved, ['branch', '--show-current']);
      currentBranch = branchOut.trim() || 'HEAD';
      const lastCommit = await runGitCommand(resolved, ['log', '-1', '--format=%aI']);
      lastCommitDate = lastCommit.trim() || undefined;
    } catch {}

    const newRepo: RepoInfo = {
      id,
      name: repoName,
      path: resolved,
      currentBranch,
      lastCommitDate,
      isStarred: false
    };

    config.repositories.push(newRepo);
    config.activeRepoId = id;
    await saveConfig(config);

    res.status(201).json({ repo: newRepo, activeRepoId: id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/repos/:id - Remove repository from workspace
reposRouter.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const config = await loadConfig();
    config.repositories = config.repositories.filter(r => r.id !== id);
    if (config.activeRepoId === id) {
      config.activeRepoId = config.repositories[0]?.id || null;
    }
    await saveConfig(config);
    res.json({ success: true, activeRepoId: config.activeRepoId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/repos/:id/star - Toggle star
reposRouter.post('/:id/star', async (req, res) => {
  try {
    const { id } = req.params;
    const config = await loadConfig();
    const repo = config.repositories.find(r => r.id === id);
    if (repo) {
      repo.isStarred = !repo.isStarred;
      await saveConfig(config);
    }
    res.json({ repo });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/repos/active - Set active repository
reposRouter.post('/active', async (req, res) => {
  try {
    const { id } = req.body;
    const config = await loadConfig();
    config.activeRepoId = id;
    await saveConfig(config);
    res.json({ activeRepoId: id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/repos/scan - Scan directory for git repositories
reposRouter.post('/scan', async (req, res) => {
  try {
    const { rootPath, maxDepth } = req.body;
    if (!rootPath) {
      return res.status(400).json({ error: 'rootPath is required' });
    }

    const resolved = path.resolve(rootPath);
    const discovered = await scanForGitRepos(resolved, maxDepth || 3);
    res.json({ repositories: discovered });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/repos/open-folder - Directly open native folder selection dialog
reposRouter.post('/open-folder', async (req, res) => {
  try {
    const config = await loadConfig();
    const activeRepo = config.repositories.find(r => r.id === config.activeRepoId);
    const initialPath = activeRepo ? path.dirname(activeRepo.path) : undefined;

    const selectedPath = await openFolderDialog(initialPath);
    if (!selectedPath) {
      return res.json({ canceled: true });
    }

    const resolved = path.resolve(selectedPath);
    const valid = await isValidGitRepo(resolved);
    if (!valid) {
      return res.status(400).json({ 
        error: `所选文件夹不是有效的 Git 仓库（未找到 .git 目录）：${resolved}` 
      });
    }

    const id = generateRepoId(resolved);

    // Check if already registered
    const existing = config.repositories.find(r => r.id === id);
    if (existing) {
      config.activeRepoId = id;
      await saveConfig(config);
      return res.json({ repo: existing, activeRepoId: id, alreadyExisted: true });
    }

    const repoName = path.basename(resolved);
    let currentBranch = 'main';
    let lastCommitDate: string | undefined;

    try {
      const branchOut = await runGitCommand(resolved, ['branch', '--show-current']);
      currentBranch = branchOut.trim() || 'HEAD';
      const lastCommit = await runGitCommand(resolved, ['log', '-1', '--format=%aI']);
      lastCommitDate = lastCommit.trim() || undefined;
    } catch {}

    const newRepo: RepoInfo = {
      id,
      name: repoName,
      path: resolved,
      currentBranch,
      lastCommitDate,
      isStarred: false
    };

    config.repositories.push(newRepo);
    config.activeRepoId = id;
    await saveConfig(config);

    res.status(201).json({ repo: newRepo, activeRepoId: id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
