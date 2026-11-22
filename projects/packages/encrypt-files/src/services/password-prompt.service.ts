import { showDialog } from '@alfredo/dialog';
import { toItemsLabel } from '../common/items-label.util';
import { generatePassword } from '../common/password-generator.util';
import { PASSWORD_ISSUE_TEXT, checkPassword } from '../common/password.util';
import type { PasswordIssue } from '../common/password.util';
import { DIALOG_TITLE } from '../config/constants';
import type { PasswordChoice } from '../models/password-choice.model';
import { copyConcealed } from './clipboard.service';

const ENCRYPT = 'Encrypt';
const GENERATE = 'Generate';
const CANCELLED: PasswordChoice = { kind: 'cancelled' };

async function askGenerated(): Promise<PasswordChoice> {
  const password = generatePassword();
  await copyConcealed(password);

  const message = `Password copied to the clipboard:\n${password}\n\nShare it with whoever opens the zip.`;
  const reply = await showDialog({
    title: DIALOG_TITLE,
    message,
    buttons: ['Cancel', ENCRYPT],
    defaultButton: ENCRYPT,
  });
  if (reply.button !== ENCRYPT) {
    return CANCELLED;
  }

  return { kind: 'generated', password };
}

async function askTyped(intro: string, issue: PasswordIssue | null): Promise<PasswordChoice> {
  const issueLine = issue ? `\n${PASSWORD_ISSUE_TEXT[issue]}` : '';
  const message = `${intro}${issueLine}`;
  const first = await showDialog({
    title: DIALOG_TITLE,
    message,
    buttons: ['Cancel', GENERATE, ENCRYPT],
    defaultButton: ENCRYPT,
    answer: 'hidden',
  });
  if (first.button === GENERATE) {
    return askGenerated();
  }

  if (first.button !== ENCRYPT) {
    return CANCELLED;
  }

  const lengthIssue = checkPassword(first.text);
  if (lengthIssue) {
    return askTyped(intro, lengthIssue);
  }

  const second = await showDialog({
    title: DIALOG_TITLE,
    message: 'Type the password again',
    buttons: ['Cancel', ENCRYPT],
    defaultButton: ENCRYPT,
    answer: 'hidden',
  });
  if (second.button !== ENCRYPT) {
    return CANCELLED;
  }

  const matchIssue = checkPassword(first.text, second.text);
  if (matchIssue) {
    return askTyped(intro, matchIssue);
  }

  return { kind: 'typed', password: first.text };
}

export async function promptPassword(itemCount: number, archiveName: string): Promise<PasswordChoice> {
  const items = toItemsLabel(itemCount);

  return askTyped(`Password for ${items} → ${archiveName}`, null);
}
