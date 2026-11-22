import { randomInt } from 'node:crypto';

/** No 0, O, o, 1, l or I, so the password survives being read aloud or retyped on a phone */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
const GROUPS = 3;
const GROUP_LENGTH = 6;

function generateGroup(): string {
  return Array.from({ length: GROUP_LENGTH }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
}

export function generatePassword(): string {
  return Array.from({ length: GROUPS }, () => generateGroup()).join('-');
}
