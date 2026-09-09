import { isToday, isYesterday, format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { CommitItem } from '../types';

export interface CommitDateGroup {
  dateKey: string;
  dateLabel: string;
  commits: CommitItem[];
}

export function groupCommitsByDate(commits: CommitItem[]): CommitDateGroup[] {
  const map = new Map<string, { label: string; commits: CommitItem[] }>();

  for (const commit of commits) {
    const d = new Date(commit.authorDate);
    const dateKey = format(d, 'yyyy-MM-dd');

    let dateLabel: string;
    if (isToday(d)) {
      dateLabel = '今天';
    } else if (isYesterday(d)) {
      dateLabel = '昨天';
    } else {
      dateLabel = format(d, 'yyyy年MM月dd日 EEEE', { locale: zhCN });
    }

    if (!map.has(dateKey)) {
      map.set(dateKey, { label: dateLabel, commits: [] });
    }
    map.get(dateKey)!.commits.push(commit);
  }

  return Array.from(map.entries()).map(([dateKey, val]) => ({
    dateKey,
    dateLabel: val.label,
    commits: val.commits
  }));
}
