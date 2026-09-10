import { 
  RepoInfo, 
  CommitItem, 
  BranchItem, 
  TagItem, 
  CommitFilterOptions, 
  DiffData, 
  GitStatusResult, 
  GitRemoteItem,
  PullRequestInfo,
  CreatePrRequest,
  CreatePrResponse,
  AuthorItem
} from '../types';

const BASE_URL = '/api';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: res.statusText }));
    const err: any = new Error(errorData.error || `Request failed with status ${res.status}`);
    err.code = errorData.code;
    throw err;
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

export interface DirectoryBrowseResult {
  currentPath: string;
  parentPath: string | null;
  isRoot: boolean;
  currentIsGit: boolean;
  drives: string[];
  directories: { name: string; path: string; isGit: boolean }[];
}

export async function browseDirectories(targetPath?: string): Promise<DirectoryBrowseResult> {
  const url = targetPath
    ? `${BASE_URL}/repos/fs/browse?path=${encodeURIComponent(targetPath)}`
    : `${BASE_URL}/repos/fs/browse`;
  const res = await fetch(url);
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
  if (options.author) params.set('author', options.author);
  if (options.since) params.set('since', options.since);
  if (options.until) params.set('until', options.until);
  if (options.path) params.set('path', options.path);
  if (options.skip !== undefined) params.set('skip', String(options.skip));
  if (options.limit !== undefined) params.set('limit', String(options.limit));

  const res = await fetch(`${BASE_URL}/repos/${repoId}/commits?${params.toString()}`);
  return handleResponse(res);
}

export async function fetchAuthors(repoId: string): Promise<AuthorItem[]> {
  const res = await fetch(`${BASE_URL}/repos/${repoId}/authors`);
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

// Git Status & Working Tree
export async function fetchRepoStatus(repoId: string): Promise<GitStatusResult> {
  const res = await fetch(`${BASE_URL}/repos/${repoId}/status`);
  return handleResponse(res);
}

// Git Commit
export async function commitChanges(
  repoId: string,
  data: { message: string; files?: string[]; push?: boolean }
): Promise<{ success: boolean; commitHash: string; message: string; output?: string; pushOutput?: string }> {
  const res = await fetch(`${BASE_URL}/repos/${repoId}/commit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return handleResponse(res);
}

// Git Pull
export async function gitPull(repoId: string): Promise<{ success: boolean; output: string }> {
  const res = await fetch(`${BASE_URL}/repos/${repoId}/pull`, {
    method: 'POST'
  });
  return handleResponse(res);
}

// Git Push
export async function gitPush(repoId: string, setUpstream?: boolean): Promise<{ success: boolean; output: string }> {
  const res = await fetch(`${BASE_URL}/repos/${repoId}/push`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ setUpstream })
  });
  return handleResponse(res);
}

// Git Remotes
export async function fetchRemotes(repoId: string): Promise<{ remotes: GitRemoteItem[] }> {
  const res = await fetch(`${BASE_URL}/repos/${repoId}/remotes`);
  return handleResponse(res);
}

// Publish to GitHub
export async function publishToGitHub(
  repoId: string,
  remoteUrl: string
): Promise<{ success: boolean; remoteUrl: string; currentBranch: string; githubUrl?: string; output?: string }> {
  const res = await fetch(`${BASE_URL}/repos/${repoId}/publish-github`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ remoteUrl })
  });
  return handleResponse(res);
}

// Create Branch
export async function createBranch(
  repoId: string,
  name: string,
  checkout = true
): Promise<{ success: boolean; branchName: string }> {
  const res = await fetch(`${BASE_URL}/repos/${repoId}/branches`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, checkout })
  });
  return handleResponse(res);
}

// Create Tag
export async function createTag(
  repoId: string,
  name: string,
  message?: string
): Promise<{ success: boolean; tagName: string }> {
  const res = await fetch(`${BASE_URL}/repos/${repoId}/tags`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, message })
  });
  return handleResponse(res);
}

// Stash / Pop
export async function gitStash(
  repoId: string,
  action: 'stash' | 'pop',
  message?: string
): Promise<{ success: boolean; action: string; output: string }> {
  const res = await fetch(`${BASE_URL}/repos/${repoId}/stash`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, message })
  });
  return handleResponse(res);
}

// Pull Request Info
export async function fetchPrInfo(repoId: string): Promise<PullRequestInfo> {
  const res = await fetch(`${BASE_URL}/repos/${repoId}/pr-info`);
  return handleResponse(res);
}

// Create Pull Request
export async function createPullRequest(
  repoId: string,
  data: CreatePrRequest
): Promise<CreatePrResponse> {
  const res = await fetch(`${BASE_URL}/repos/${repoId}/pr`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return handleResponse(res);
}
