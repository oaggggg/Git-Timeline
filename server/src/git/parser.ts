import { runGitCommand } from './cli.js';
import { CommitItem, CommitFileChange, BranchItem, TagItem, CommitFilterOptions, AuthorItem } from '../types.js';

const RECORD_SEP = '\x1e';
const FIELD_SEP = '\x1f';

export async function parseCommits(
  repoPath: string,
  options: CommitFilterOptions = {}
): Promise<{ commits: CommitItem[]; hasMore: boolean }> {
  const limit = options.limit || 30;
  const skip = options.skip || 0;

  const fetchCount = limit + 1;

  const args: string[] = [
    'log',
    `--max-count=${fetchCount}`,
    `--skip=${skip}`,
    `--pretty=format:${RECORD_SEP}%H${FIELD_SEP}%h${FIELD_SEP}%an${FIELD_SEP}%ae${FIELD_SEP}%aI${FIELD_SEP}%cn${FIELD_SEP}%ce${FIELD_SEP}%cI${FIELD_SEP}%s${FIELD_SEP}%b${FIELD_SEP}%P${FIELD_SEP}%D`,
    '--numstat'
  ];

  if (options.branch && options.branch !== 'ALL') {
    args.push(options.branch);
  } else {
    args.push('--all');
  }

  if (options.search && options.search.trim()) {
    const s = options.search.trim();
    args.push(`--grep=${s}`, `-i`);
  }

  if (options.author && options.author.trim()) {
    const a = options.author.trim();
    args.push(`--author=${a}`, `-i`);
  }

  if (options.since && options.since.trim()) {
    args.push(`--since=${options.since.trim()}`);
  }
  if (options.until && options.until.trim()) {
    args.push(`--until=${options.until.trim()}`);
  }

  if (options.path && options.path.trim()) {
    args.push('--', options.path.trim());
  }

  const [output, repoTags] = await Promise.all([
    runGitCommand(repoPath, args),
    getTags(repoPath).catch(() => [] as TagItem[])
  ]);

  if (!output || !output.trim()) {
    return { commits: [], hasMore: false };
  }

  // Build map of commit hash -> tag names
  const tagMap = new Map<string, string[]>();
  for (const tag of repoTags) {
    if (!tag.commitHash) continue;
    const existing = tagMap.get(tag.commitHash) || [];
    existing.push(tag.name);
    tagMap.set(tag.commitHash, existing);
  }

  const rawChunks = output.split(RECORD_SEP).filter(chunk => chunk.trim().length > 0);
  const commits: CommitItem[] = [];

  for (const chunk of rawChunks) {
    const firstNewline = chunk.indexOf('\n');
    let metaPart: string;
    let numstatPart = '';

    if (firstNewline === -1) {
      metaPart = chunk;
    } else {
      metaPart = chunk.substring(0, firstNewline);
      numstatPart = chunk.substring(firstNewline + 1).trim();
    }

    const fields = metaPart.split(FIELD_SEP);
    if (fields.length < 10) continue;

    const [
      hash,
      shortHash,
      authorName,
      authorEmail,
      authorDate,
      committerName,
      committerEmail,
      committerDate,
      subject,
      body,
      parentsStr,
      refsStr
    ] = fields;

    const parents = parentsStr ? parentsStr.trim().split(/\s+/).filter(Boolean) : [];
    const refs = refsStr
      ? refsStr
          .split(',')
          .map(r => r.trim())
          .filter(Boolean)
      : [];

    let totalAdditions = 0;
    let totalDeletions = 0;
    const fileChanges: CommitFileChange[] = [];

    if (numstatPart) {
      const lines = numstatPart.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const parts = trimmed.split('\t');
        if (parts.length >= 3) {
          const addStr = parts[0];
          const delStr = parts[1];
          const filePath = parts.slice(2).join('\t');

          const adds = addStr === '-' ? 0 : parseInt(addStr, 10) || 0;
          const dels = delStr === '-' ? 0 : parseInt(delStr, 10) || 0;
          totalAdditions += adds;
          totalDeletions += dels;

          fileChanges.push({
            path: filePath,
            additions: adds,
            deletions: dels,
            status: 'modified'
          });
        }
      }
    }

    const tagsFromRefs = refs
      .filter(r => r.startsWith('tag: '))
      .map(r => r.replace(/^tag:\s*/, '').trim());
    const tagsFromMap = tagMap.get(hash) || tagMap.get(shortHash) || [];
    const combinedTags = Array.from(new Set([...tagsFromRefs, ...tagsFromMap])).filter(Boolean);

    commits.push({
      hash,
      shortHash: shortHash || hash.substring(0, 7),
      authorName,
      authorEmail,
      authorDate,
      committerName,
      committerEmail,
      committerDate,
      subject,
      body: body ? body.trim() : '',
      parents,
      refs,
      tags: combinedTags.length > 0 ? combinedTags : undefined,
      stats: {
        filesChanged: fileChanges.length,
        additions: totalAdditions,
        deletions: totalDeletions
      },
      files: fileChanges
    });
  }

  const hasMore = commits.length > limit;
  const resultCommits = hasMore ? commits.slice(0, limit) : commits;

  return { commits: resultCommits, hasMore };
}

export async function getCommitDiff(
  repoPath: string,
  hash: string
): Promise<{ diff: string; files: CommitFileChange[] }> {
  // Support both normal commits and merge commits
  let diff = '';
  try {
    diff = await runGitCommand(repoPath, ['show', '--patch', '--unified=3', '-m', '--first-parent', hash]);
  } catch {
    diff = await runGitCommand(repoPath, ['show', '--patch', '--unified=3', hash]);
  }

  let statusOutput = '';
  try {
    statusOutput = await runGitCommand(repoPath, [
      'show',
      '--numstat',
      '--name-status',
      '--pretty=format:',
      '-m',
      '--first-parent',
      hash
    ]);
  } catch {
    statusOutput = await runGitCommand(repoPath, [
      'show',
      '--numstat',
      '--name-status',
      '--pretty=format:',
      hash
    ]);
  }

  const files: CommitFileChange[] = [];
  const statusMap = new Map<string, { status: CommitFileChange['status']; oldPath?: string }>();
  const numstatMap = new Map<string, { adds: number; dels: number }>();

  const lines = statusOutput.split('\n').map(l => l.trim()).filter(Boolean);
  for (const line of lines) {
    const parts = line.split('\t');
    if (parts.length === 2 && /^[ACDMRTUXB][0-9]*$/.test(parts[0])) {
      const statusCode = parts[0][0];
      const filePath = parts[1];
      let status: CommitFileChange['status'] = 'modified';
      if (statusCode === 'A') status = 'added';
      else if (statusCode === 'D') status = 'deleted';
      else if (statusCode === 'M') status = 'modified';
      else if (statusCode === 'C') status = 'copied';
      statusMap.set(filePath, { status });
    } else if (parts.length === 3 && parts[0].startsWith('R')) {
      statusMap.set(parts[2], { status: 'renamed', oldPath: parts[1] });
    } else if (parts.length >= 3 && /^[0-9-]+$/.test(parts[0])) {
      const adds = parts[0] === '-' ? 0 : parseInt(parts[0], 10) || 0;
      const dels = parts[1] === '-' ? 0 : parseInt(parts[1], 10) || 0;
      const filePath = parts.slice(2).join('\t');
      numstatMap.set(filePath, { adds, dels });
    }
  }

  const allPaths = new Set([...statusMap.keys(), ...numstatMap.keys()]);
  for (const p of allPaths) {
    const s = statusMap.get(p);
    const n = numstatMap.get(p) || { adds: 0, dels: 0 };
    files.push({
      path: p,
      oldPath: s?.oldPath,
      additions: n.adds,
      deletions: n.dels,
      status: s?.status || 'modified'
    });
  }

  return { diff, files };
}

export async function getBranches(repoPath: string): Promise<BranchItem[]> {
  const output = await runGitCommand(repoPath, [
    'branch',
    '-a',
    '--format=%(HEAD)|%(refname:short)|%(objectname:short)|%(refname)'
  ]);

  const branches: BranchItem[] = [];
  const lines = output.split('\n').map(l => l.trim()).filter(Boolean);

  for (const line of lines) {
    const [head, shortRef, commitHash, fullRef] = line.split('|');
    const isCurrent = head.trim() === '*';
    const isRemote = fullRef ? fullRef.startsWith('refs/remotes/') : false;

    if (shortRef.endsWith('/HEAD')) continue;

    branches.push({
      name: shortRef,
      current: isCurrent,
      isRemote,
      commitHash: commitHash || ''
    });
  }

  return branches;
}

export async function getTags(repoPath: string): Promise<TagItem[]> {
  try {
    const output = await runGitCommand(repoPath, [
      'tag',
      '-l',
      '--format=%(refname:short)|%(objectname:short)'
    ]);
    return output
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean)
      .map(line => {
        const [name, commitHash] = line.split('|');
        return { name, commitHash };
      });
  } catch {
    return [];
  }
}

export async function getAuthors(repoPath: string): Promise<AuthorItem[]> {
  try {
    const output = await runGitCommand(repoPath, ['shortlog', '-sne', '--all']);
    if (!output || !output.trim()) return [];

    const lines = output.trim().split('\n');
    const authors: AuthorItem[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      // Match: "17\tAntigravity Developer <developer@example.com>"
      const match = trimmed.match(/^(\d+)\s+([^<]+?)\s*<([^>]+)>$/);
      if (match) {
        authors.push({
          commitsCount: parseInt(match[1], 10),
          name: match[2].trim(),
          email: match[3].trim()
        });
      } else {
        const parts = trimmed.split(/\s{2,}|\t/);
        if (parts.length >= 2) {
          authors.push({
            commitsCount: parseInt(parts[0].trim(), 10) || 1,
            name: parts[1].trim(),
            email: ''
          });
        }
      }
    }
    return authors;
  } catch {
    return [];
  }
}
