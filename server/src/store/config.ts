import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { RepoInfo } from '../types.js';

interface ConfigData {
  repositories: RepoInfo[];
  activeRepoId: string | null;
  theme: 'light' | 'dark' | 'system';
}

const CONFIG_FILE = path.join(os.homedir(), '.git-timeline-viewer.json');

let cachedConfig: ConfigData | null = null;

export async function loadConfig(): Promise<ConfigData> {
  if (cachedConfig) return cachedConfig;

  try {
    const raw = await fs.readFile(CONFIG_FILE, 'utf-8');
    cachedConfig = JSON.parse(raw);
    if (!cachedConfig?.repositories) {
      cachedConfig = { repositories: [], activeRepoId: null, theme: 'dark' };
    }
    return cachedConfig;
  } catch {
    cachedConfig = {
      repositories: [],
      activeRepoId: null,
      theme: 'dark'
    };
    await saveConfig(cachedConfig);
    return cachedConfig;
  }
}

export async function saveConfig(config: ConfigData): Promise<void> {
  cachedConfig = config;
  try {
    await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write config file:', err);
  }
}

export function generateRepoId(repoPath: string): string {
  return crypto.createHash('md5').update(path.resolve(repoPath).toLowerCase()).digest('hex').substring(0, 12);
}
