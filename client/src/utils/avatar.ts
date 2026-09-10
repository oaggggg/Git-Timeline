export function getAvatarColor(name: string): string {
  const colors = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', 
    '#8b5cf6', '#ec4899', '#06b6d4', '#6366f1',
    '#14b8a6', '#f97316', '#84cc16', '#a855f7'
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

export function getInitials(name: string): string {
  if (!name) return '?';
  const clean = name.trim();
  const words = clean.split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

/**
 * Returns GitHub avatar URL if a GitHub username can be identified.
 * Strictly fetches ONLY from GitHub avatars. Zero third-party avatar providers.
 */
export function getAvatarUrls(name: string, email?: string): string[] {
  const urls: string[] = [];
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanName = (name || '').trim();

  // 1. GitHub noreply email (e.g. 123456+username@users.noreply.github.com)
  const ghNoreplyMatch = cleanEmail.match(/^(?:\d+\+)?([a-zA-Z0-9-]+)@users\.noreply\.github\.com$/i);
  if (ghNoreplyMatch) {
    urls.push(`https://github.com/${ghNoreplyMatch[1]}.png?size=128`);
    return urls;
  }

  // 2. Direct GitHub email (e.g. username@github.com)
  if (cleanEmail.endsWith('@github.com')) {
    const ghUser = cleanEmail.split('@')[0];
    if (ghUser) {
      urls.push(`https://github.com/${ghUser}.png?size=128`);
      return urls;
    }
  }

  // 3. Single-word GitHub handle detection from author name (e.g. 'oaggggg', 'torvalds')
  // GitHub usernames are 1-39 characters, alphanumeric with hyphens, not multiple words
  if (/^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/.test(cleanName)) {
    const lower = cleanName.toLowerCase();
    const reserved = new Set([
      'developer', 'admin', 'administrator', 'root', 'user', 'git', 
      'unknown', 'none', 'null', 'undefined', 'test', 'example'
    ]);
    if (!reserved.has(lower)) {
      urls.push(`https://github.com/${cleanName}.png?size=128`);
    }
  }

  return urls;
}
