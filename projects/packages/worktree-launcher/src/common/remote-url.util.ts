const HOST = '(?:www\\.)?github\\.com';
const REMOTE_PATTERNS: readonly RegExp[] = [
  new RegExp(`^[\\w.-]+@${HOST}:([\\w.-]+)\\/([\\w.-]+?)(?:\\.git)?\\/?$`, 'i'),
  new RegExp(`^(?:https?|ssh|git):\\/\\/(?:[^@/]+@)?${HOST}(?::\\d+)?\\/([\\w.-]+)\\/([\\w.-]+?)(?:\\.git)?\\/?$`, 'i'),
];

/** Only github.com hosts match, since PRs come from github.com and another host could share an owner/repo. Lowercased because GitHub names are case-insensitive. */
export function toNameWithOwner(url: string): string | null {
  const trimmed = url.trim();
  for (const pattern of REMOTE_PATTERNS) {
    const match = pattern.exec(trimmed);
    if (match?.[1] && match[2]) {
      return `${match[1]}/${match[2]}`.toLowerCase();
    }
  }

  return null;
}
