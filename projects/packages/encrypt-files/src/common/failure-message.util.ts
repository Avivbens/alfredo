import { basename } from 'node:path';
import { z } from 'zod';

const systemErrorSchema = z.object({ code: z.string(), path: z.string().optional() });

function describeSystemError(error: unknown): string | null {
  const parsed = systemErrorSchema.safeParse(error);
  if (!parsed.success) {
    return null;
  }

  const { code, path } = parsed.data;
  if (code === 'ENOSPC') {
    return 'the disk is full';
  }

  if (!path) {
    return null;
  }

  if (code === 'EACCES' || code === 'EPERM') {
    return `no permission to read ${basename(path)}`;
  }

  if (code === 'ENOENT') {
    return `${basename(path)} is gone`;
  }

  return null;
}

export function toFailureMessage(error: unknown): string {
  const fallback = error instanceof Error ? error.message : String(error);
  const reason = describeSystemError(error) ?? fallback;

  return `Couldn't encrypt - ${reason}`;
}
