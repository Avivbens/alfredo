import { showDialog } from '@alfredo/dialog';
import { toItemsLabel } from '../common/items-label.util';
import { PASSWORD_ISSUE_TEXT, checkPassword } from '../common/password.util';
import type { PasswordIssue } from '../common/password.util';
import { DIALOG_TITLE } from '../config/constants';
import type { PasswordChoice } from '../models/password-choice.model';

const ENCRYPT = 'Encrypt';
const CANCELLED: PasswordChoice = { kind: 'cancelled' };

async function askPassword(message: string): Promise<string | null> {
  const reply = await showDialog({
    title: DIALOG_TITLE,
    message,
    buttons: ['Cancel', ENCRYPT],
    defaultButton: ENCRYPT,
    answer: 'hidden',
  });
  if (reply.button !== ENCRYPT) {
    return null;
  }

  return reply.text;
}

async function askTyped(intro: string, issue: PasswordIssue | null): Promise<PasswordChoice> {
  const message = issue ? `${intro}\n${PASSWORD_ISSUE_TEXT[issue]}` : intro;
  const first = await askPassword(message);
  if (first === null) {
    return CANCELLED;
  }

  const lengthIssue = checkPassword(first);
  if (lengthIssue) {
    return askTyped(intro, lengthIssue);
  }

  const second = await askPassword('Type the password again');
  if (second === null) {
    return CANCELLED;
  }

  const matchIssue = checkPassword(first, second);
  if (matchIssue) {
    return askTyped(intro, matchIssue);
  }

  return { kind: 'typed', password: first };
}

export async function promptPassword(itemCount: number, archiveName: string): Promise<PasswordChoice> {
  const items = toItemsLabel(itemCount);

  return askTyped(`Password for ${items} → ${archiveName}`, null);
}
