import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { reposRouter } from './routes/repos.js';
import { commitsRouter } from './routes/commits.js';
import { isValidGitRepo } from './git/cli.js';
import { loadConfig, saveConfig, generateRepoId } from './store/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4321;

app.use(cors());
app.use(express.json({ limit: '20mb' }));

// API routes
app.use('/api/repos', reposRouter);
app.use('/api/repos', commitsRouter);

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

// Auto-register current directory if it is a git repo
async function initCurrentDirectory() {
  try {
    const cwd = process.cwd();
    const isRepo = await isValidGitRepo(cwd);
    if (isRepo) {
      const config = await loadConfig();
      const id = generateRepoId(cwd);
      const exists = config.repositories.find(r => r.id === id);
      if (!exists) {
        config.repositories.push({
          id,
          name: path.basename(cwd),
          path: cwd,
          currentBranch: 'main',
          isStarred: false
        });
      }
      if (!config.activeRepoId) {
        config.activeRepoId = id;
      }
      await saveConfig(config);
      console.log(`[Git Timeline] Auto-registered current git repo: ${cwd}`);
    }
  } catch (err) {
    console.warn('[Git Timeline] Could not auto-register current directory:', err);
  }
}

app.listen(PORT, async () => {
  await initCurrentDirectory();
  console.log(`[Git Timeline] 服务已启动: http://localhost:${PORT}`);
});
