const TYPED_PREFIX = /^(feat|fix|migration)\/(.*)$/s;
const DISALLOWED_RUNS = /[^a-z0-9._]+/g;
const REPEATED_DOTS = /\.{2,}/g;
const LEADING_NOISE = /^[.-]+/;
const TRAILING_NOISE = /(?:\.lock|[.-])+$/;

/** Git still refuses `..`, a leading dash or dot, and a `.lock` suffix built from allowed characters, so each segment strips them. */
function toSegment(segment: string): string {
  return segment
    .replaceAll(DISALLOWED_RUNS, '-')
    .replaceAll(REPEATED_DOTS, '.')
    .replace(LEADING_NOISE, '')
    .replace(TRAILING_NOISE, '');
}

export function toTaskBranch(input: string): string | null {
  const cleaned = input.trim().toLowerCase();
  const typed = TYPED_PREFIX.exec(cleaned);
  const prefix = typed?.[1] ?? 'feat';
  const rest = typed?.[2] ?? cleaned;
  const body = rest.split('/').map(toSegment).filter(Boolean).join('/');

  return body ? `${prefix}/${body}` : null;
}
