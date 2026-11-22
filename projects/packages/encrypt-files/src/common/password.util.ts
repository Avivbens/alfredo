import { MIN_PASSWORD_LENGTH } from '../config/constants';

export type PasswordIssue = 'too-short' | 'mismatch';

export const PASSWORD_ISSUE_TEXT: Record<PasswordIssue, string> = {
  'too-short': `Use at least ${MIN_PASSWORD_LENGTH} characters`,
  mismatch: "Passwords didn't match",
};

export function checkPassword(first: string, second?: string): PasswordIssue | null {
  if (first.length < MIN_PASSWORD_LENGTH) {
    return 'too-short';
  }

  if (second !== undefined && second !== first) {
    return 'mismatch';
  }

  return null;
}
