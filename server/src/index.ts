import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { reposRouter } from './routes/repos.js';
import { commitsRouter } from './routes/commits.js';
import { gitOpsRouter } from './routes/git-ops.js';
import { isValidGitRepo, runGitCommand } from './git/cli.js';
import { loadConfig, saveConfig, generateRepoId } from './store/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 4321;
const HOST = process.env.HOST || '127.0.0.1';

app.disable('x-powered-by');
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));
app.use(express.json({ limit: '2mb' }));

app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ error: '请求内容过大' });
  }
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ error: '请求 JSON 格式无效' });
  }
  next(err);
});

// API routes
app.use('/api/repos', reposRouter);
app.use('/api/repos', commitsRouter);
app.use('/api/repos', gitOpsRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve frontend build if dist exists
const clientDist = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'API 路径不存在' });
});

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Git Timeline] 请求处理失败:', err);
  if (res.headersSent) return;
  res.status(500).json({ error: '服务器内部错误' });
});

// Auto-register current directory if it is a git repo
async function initCurrentDirectory() {
  try {
    const cwd = process.cwd();
    const isRepo = await isValidGitRepo(cwd);
    if (isRepo) {
      const config = await loadConfig();
      const id = generateRepoId(cwd);
      const exists = config.repositories.find(r => r.id === id);

      let currentBranch = 'HEAD';
      let lastCommitDate: string | undefined;
      try {
        const branchOut = await runGitCommand(cwd, ['branch', '--show-current']);
        currentBranch = branchOut.trim() || 'HEAD';
        const lastCommit = await runGitCommand(cwd, ['log', '-1', '--format=%aI']);
        lastCommitDate = lastCommit.trim() || undefined;
      } catch {}

      if (!exists) {
        config.repositories.push({
          id,
          name: path.basename(cwd),
          path: cwd,
          currentBranch,
          lastCommitDate,
          isStarred: false
        });
      } else {
        exists.currentBranch = currentBranch;
        exists.lastCommitDate = lastCommitDate;
      }

      if (!config.activeRepoId) {
        config.activeRepoId = id;
      }
      await saveConfig(config);
      console.log(`[Git Timeline] Auto-registered git repo: ${cwd} (${currentBranch})`);
    }
  } catch (err) {
    console.warn('[Git Timeline] Could not auto-register current directory:', err);
  }
}

const server = app.listen(PORT, HOST, async () => {
  await initCurrentDirectory();
  console.log(`[Git Timeline] 服务已启动: http://${HOST}:${PORT}`);
});

function shutdown(signal: string) {
  console.log(`[Git Timeline] 收到 ${signal}，正在关闭服务...`);
  server.close(error => {
    if (error) {
      console.error('[Git Timeline] 关闭服务失败:', error);
      process.exitCode = 1;
    }
    process.exit();
  });
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
