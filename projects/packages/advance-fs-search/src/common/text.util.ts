export function pluralize(count: number, noun: string): string {
  return `${count} ${count === 1 ? noun : `${noun}s`}`;
}

export function joinSubtitle(...parts: string[]): string {
  return parts.join(' · ');
}

export const TREE_GLYPHS = { header: '┌ ', member: '│ ', last: '└ ' } as const;

/** Typing can hide any row of a stack, so the last row shown closes its tree. */
export function toMemberGlyph(index: number, count: number): string {
  return index === count - 1 ? TREE_GLYPHS.last : TREE_GLYPHS.member;
}
