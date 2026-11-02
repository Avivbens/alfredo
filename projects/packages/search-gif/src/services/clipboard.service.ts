import { escapeAppleScriptString, runAppleScript } from '@alfredo/run-applescript';

/** A file reference rather than image data, so apps that accept pasted files upload the GIF itself, animation included. */
export async function copyFileToClipboard(path: string): Promise<void> {
  await runAppleScript(`set the clipboard to (POSIX file "${escapeAppleScriptString(path)}")`);
}
