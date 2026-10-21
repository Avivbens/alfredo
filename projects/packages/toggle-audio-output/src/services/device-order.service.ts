import type { OutputEntry } from '../models/output-entry.schema';

/** macOS writes curly apostrophes into device names, but people type straight ones. */
function toComparable(name: string): string {
  return name.trim().toLowerCase().replace(/[‘’]/g, "'");
}

function tierOf(entry: OutputEntry): number {
  switch (entry.kind) {
    case 'core-audio':
      return entry.current ? 0 : 1;

    case 'airplay':
      return 2;

    case 'bluetooth':
      if (!entry.isAudio) {
        return 5;
      }

      return entry.connected ? 3 : 4;
  }
}

/**
 * The preferred list is the user's own ordering, so it wins outright. Whatever
 * is left goes current output first, then what switches instantly, then what
 * needs connecting - non-audio devices last.
 */
export function orderByPreference(entries: OutputEntry[], preferredNames: string[]): OutputEntry[] {
  const rank = new Map(preferredNames.map((name, index) => [toComparable(name), index]));
  const rankOf = ({ name }: OutputEntry): number => rank.get(toComparable(name)) ?? Infinity;

  return [...entries].sort((a, b) => {
    const [aRank, bRank] = [rankOf(a), rankOf(b)];

    if (aRank !== bRank) {
      return aRank - bRank;
    }

    return tierOf(a) - tierOf(b) || a.name.localeCompare(b.name);
  });
}
