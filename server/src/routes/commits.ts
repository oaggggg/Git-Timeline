import { Router } from 'express';
import { loadConfig } from '../store/config.js';
import { parseCommits, getCommitDiff, getBranches, getTags, getAuthors } from '../git/parser.js';
import { isValidGitRepo, runGitCommand } from '../git/cli.js';

export const commitsRouter = Router();

async function getRepoPathById(id: string): Promise<string | null> {
  const config = await loadConfig();
  const repo = config.repositories.find(r => r.id === id);
  if (!repo) return null;
  const valid = await isValidGitRepo(repo.path);
  if (!valid) return null;
  return repo.path;
}

// GET /api/repos/:id/commits
commitsRouter.get('/:id/commits', async (req, res) => {
  try {
    const { id } = req.params;
    const repoPath = await getRepoPathById(id);
    if (!repoPath) {
      return res.status(404).json({ error: 'Repository not found or invalid' });
    }

    const { branch, search, author, since, until, path: filePath, skip, limit } = req.query;

    const result = await parseCommits(repoPath, {
      branch: branch ? String(branch) : undefined,
      search: search ? String(search) : undefined,
      author: author ? String(author) : undefined,
      since: since ? String(since) : undefined,
      until: until ? String(until) : undefined,
      path: filePath ? String(filePath) : undefined,
      skip: skip ? parseInt(String(skip), 10) : 0,
      limit: limit ? parseInt(String(limit), 10) : 30
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/repos/:id/authors
commitsRouter.get('/:id/authors', async (req, res) => {
  try {
    const { id } = req.params;
    const repoPath = await getRepoPathById(id);
    if (!repoPath) {
      return res.status(404).json({ error: 'Repository not found or invalid' });
    }

    const authors = await getAuthors(repoPath);
    res.json(authors);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/repos/:id/branches
commitsRouter.get('/:id/branches', async (req, res) => {
  try {
    const { id } = req.params;
    const repoPath = await getRepoPathById(id);
    if (!repoPath) {
      return res.status(404).json({ error: 'Repository not found or invalid' });
    }

    const [branches, tags] = await Promise.all([
      getBranches(repoPath),
      getTags(repoPath)
    ]);

    res.json({ branches, tags });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/repos/:id/commits/:hash/diff
commitsRouter.get('/:id/commits/:hash/diff', async (req, res) => {
  try {
    const { id, hash } = req.params;
    const repoPath = await getRepoPathById(id);
    if (!repoPath) {
      return res.status(404).json({ error: 'Repository not found or invalid' });
    }

    const diffData = await getCommitDiff(repoPath, hash);
    res.json(diffData);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/repos/:id/commits/compare?base=<hash>&head=<hash>
commitsRouter.get('/:id/commits/compare', async (req, res) => {
  try {
    const repoPath = await getRepoPathById(req.params.id);
    if (!repoPath) return res.status(404).json({ error: '仓库不存在或路径无效' });

    const base = String(req.query.base || '').trim();
    const head = String(req.query.head || '').trim();
    if (!/^[0-9a-f]{4,40}$/i.test(base) || !/^[0-9a-f]{4,40}$/i.test(head)) {
      return res.status(400).json({ error: 'base 和 head 必须是合法提交 Hash' });
    }

    const diff = await runGitCommand(repoPath, ['diff', '--no-ext-diff', base, head, '--']);
    res.json({ base, head, diff });
  } catch (err: any) {
    res.status(500).json({ error: err.message || '提交对比失败' });
  }
});
