import { RepoInfo, CommitItem, BranchItem, TagItem, CommitFilterOptions, DiffData } from '../types';

const BASE_URL = '/api';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(errorData.error || `Request failed with status ${res.status}`);
  }
  return res.json();
}

export async function fetchRepos(): Promise<{ repositories: RepoInfo[]; activeRepoId: string | null }> {
  const res = await fetch(`${BASE_URL}/repos`);
  return handleResponse(res);
}

export async function addRepo(repoPath: string, name?: string): Promise<{ repo: RepoInfo; activeRepoId: string }> {
  const res = await fetch(`${BASE_URL}/repos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repoPath, name })
  });
  return handleResponse(res);
}

export async function openRepoViaDialog(): Promise<{
  canceled?: boolean;
  repo?: RepoInfo;
  activeRepoId?: string;
  alreadyExisted?: boolean;
}> {
  const res = await fetch(`${BASE_URL}/repos/open-folder`, {
    method: 'POST'
  });
  return handleResponse(res);
}

export async function deleteRepo(id: string): Promise<{ success: boolean; activeRepoId: string | null }> {
  const res = await fetch(`${BASE_URL}/repos/${id}`, {
    method: 'DELETE'
  });
  return handleResponse(res);
}

export async function toggleStarRepo(id: string): Promise<{ repo: RepoInfo }> {
  const res = await fetch(`${BASE_URL}/repos/${id}/star`, {
    method: 'POST'
  });
  return handleResponse(res);
}

export async function setActiveRepo(id: string): Promise<{ activeRepoId: string }> {
  const res = await fetch(`${BASE_URL}/repos/active`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id })
  });
  return handleResponse(res);
}

export async function scanRepos(rootPath: string, maxDepth = 3): Promise<{ repositories: { path: string; name: string }[] }> {
  const res = await fetch(`${BASE_URL}/repos/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rootPath, maxDepth })
  });
  return handleResponse(res);
}

export async function fetchCommits(
  repoId: string,
  options: CommitFilterOptions = {}
): Promise<{ commits: CommitItem[]; hasMore: boolean }> {
  const params = new URLSearchParams();
  if (options.branch) params.set('branch', options.branch);
  if (options.search) params.set('search', options.search);
  if (options.since) params.set('since', options.since);
  if (options.until) params.set('until', options.until);
  if (options.path) params.set('path', options.path);
  if (options.skip !== undefined) params.set('skip', String(options.skip));
  if (options.limit !== undefined) params.set('limit', String(options.limit));

  const res = await fetch(`${BASE_URL}/repos/${repoId}/commits?${params.toString()}`);
  return handleResponse(res);
}

export async function fetchBranches(repoId: string): Promise<{ branches: BranchItem[]; tags: TagItem[] }> {
  const res = await fetch(`${BASE_URL}/repos/${repoId}/branches`);
  return handleResponse(res);
}

const diffCache = new Map<string, DiffData>();

export async function fetchCommitDiff(repoId: string, hash: string): Promise<DiffData> {
  const key = `${repoId}:${hash}`;
  if (diffCache.has(key)) {
    return diffCache.get(key)!;
  }
  const res = await fetch(`${BASE_URL}/repos/${repoId}/commits/${hash}/diff`);
  const data = await handleResponse<DiffData>(res);
  diffCache.set(key, data);
  return data;
}

export function prefetchCommitDiff(repoId: string, hash: string): void {
  const key = `${repoId}:${hash}`;
  if (!diffCache.has(key)) {
    fetchCommitDiff(repoId, hash).catch(() => {});
  }
}

export function getCachedCommitDiff(repoId: string, hash: string): DiffData | undefined {
  return diffCache.get(`${repoId}:${hash}`);
}
