export interface CommitFileChange {
  path: string;
  oldPath?: string;
  additions: number;
  deletions: number;
  status: 'added' | 'modified' | 'deleted' | 'renamed' | 'copied' | 'unknown';
}

export interface CommitItem {
  hash: string;
  shortHash: string;
  authorName: string;
  authorEmail: string;
  authorDate: string; // ISO string
  committerName: string;
  committerEmail: string;
  committerDate: string; // ISO string
  subject: string;
  body: string;
  parents: string[];
  refs: string[]; // branches, tags, HEAD
  tags?: string[]; // parsed release tags e.g. ["v1.0.0"]
  stats: {
    filesChanged: number;
    additions: number;
    deletions: number;
  };
  files?: CommitFileChange[];
}

export interface BranchItem {
  name: string;
  current: boolean;
  isRemote: boolean;
  commitHash: string;
}

export interface TagItem {
  name: string;
  commitHash: string;
}

export interface RepoInfo {
  id: string;
  name: string;
  path: string;
  currentBranch: string;
  lastCommitDate?: string;
  isStarred?: boolean;
}

export interface CommitFilterOptions {
  branch?: string; // branch name or 'ALL'
  search?: string; // keyword in subject, body, author, hash
  author?: string; // filter by author name or email
  since?: string;  // ISO date or relative
  until?: string;  // ISO date
  path?: string;   // specific file or folder path
  skip?: number;
  limit?: number;
}

export interface AuthorItem {
  name: string;
  email: string;
  commitsCount: number;
}

export interface GitFileStatus {
  path: string;
  status: 'modified' | 'added' | 'deleted' | 'renamed' | 'untracked';
  staged: boolean;
}

export interface GitStatusResult {
  branch: string;
  ahead: number;
  behind: number;
  files: GitFileStatus[];
  clean: boolean;
}

export interface GitRemoteItem {
  name: string;
  fetchUrl: string;
  pushUrl: string;
  isGitHub: boolean;
  githubRepo?: string;
}

export interface PullRequestInfo {
  currentBranch: string;
  defaultBaseBranch: string;
  branches: string[];
  githubRepo?: string;
  githubUrl?: string;
  hasGitHubRemote: boolean;
  ahead: number;
  latestCommitSubject?: string;
  recentCommits: string[];
}

export interface CreatePrRequest {
  title: string;
  body?: string;
  head: string;
  base: string;
  token?: string;
}

export interface CreatePrResponse {
  success: boolean;
  compareUrl: string;
  pr?: {
    id: number;
    number: number;
    html_url: string;
    title: string;
    state: string;
  };
}
