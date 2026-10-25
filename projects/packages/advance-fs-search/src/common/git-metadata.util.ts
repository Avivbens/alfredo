import { stripPrefix } from './text.util';

const SYMBOLIC_REF = 'ref: ';
const BRANCH_REFS = 'refs/heads/';
const SHORT_SHA_LENGTH = 7;
const GITDIR_POINTER = /^gitdir: (.+)$/m;
const LINKED_ADMIN_DIR = /^(.+)\/\.git\/worktrees\/[^/]+$/;

function toBranchName(head: string): string {
  return stripPrefix(stripPrefix(head, SYMBOLIC_REF), BRANCH_REFS);
}

function toShortSha(sha: string): string {
  return sha.slice(0, SHORT_SHA_LENGTH);
}

/** A detached HEAD holds a bare commit sha, shortened the way git prints it. */
export function parseHead(head: string): string {
  return head.startsWith(SYMBOLIC_REF) ? toBranchName(head) : toShortSha(head);
}

export function parseGitdirPointer(dotGitFile: string): string | null {
  return dotGitFile.match(GITDIR_POINTER)?.[1] ?? null;
}

/** Only linked worktrees live under `.git/worktrees`. A submodule's gitdir points into `.git/modules` instead. */
export function toRepoOfAdminDir(adminDir: string): string | null {
  return adminDir.match(LINKED_ADMIN_DIR)?.[1] ?? null;
}
