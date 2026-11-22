export const ARCHIVE_NAME = 'Archive.zip';
export const DIALOG_TITLE = 'Encrypt Files';

/** WinZip AES derives its key with only 1,000 PBKDF2 rounds, so a short password is cheap to guess */
export const MIN_PASSWORD_LENGTH = 8;

export const SKIPPED_NAMES = ['.DS_Store'];

/** 256 MiB under 4 GiB: deflate grows incompressible data slightly, and a non-ZIP64 entry that crosses 4 GiB fails at the end */
export const ZIP64_THRESHOLD = 0xf0000000;
