import { z } from 'zod';

/**
 * An osascript failure's message repeats the whole script and its JSON argument before the cause,
 * so stderr alone is the readable part. A zod error's message is raw issue JSON.
 */
export function toFailureMessage(error: unknown): string {
  if (error instanceof z.ZodError) {
    return z.prettifyError(error);
  }

  if (typeof error === 'object' && error !== null && 'stderr' in error && typeof error.stderr === 'string') {
    const stderr = error.stderr.trim();
    if (stderr) {
      return stderr;
    }
  }

  return error instanceof Error ? error.message : String(error);
}
