export function messageOf(reason: unknown): string {
  return reason instanceof Error ? reason.message : String(reason);
}
