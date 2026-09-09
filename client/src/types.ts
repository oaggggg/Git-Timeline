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
  refs: string[];
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
  branch?: string;
  search?: string;
  since?: string;
  until?: string;
  path?: string;
  skip?: number;
  limit?: number;
}

export interface DiffData {
  diff: string;
  files: CommitFileChange[];
}
