export function pluralize(count: number, noun: string): string {
  return `${count} ${count === 1 ? noun : `${noun}s`}`;
}

export function joinSubtitle(...parts: string[]): string {
  return parts.join(' · ');
}
