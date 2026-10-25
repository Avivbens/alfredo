export function stripPrefix(text: string, prefix: string): string {
  return text.startsWith(prefix) ? text.slice(prefix.length) : text;
}

export function pluralize(count: number, noun: string): string {
  return `${count} ${count === 1 ? noun : `${noun}s`}`;
}

export function joinSubtitle(...parts: string[]): string {
  return parts.join(' · ');
}
