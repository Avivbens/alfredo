import { runAppleScript } from '@alfredo/run-applescript';
import type { CopyOptions } from './copy-options.schema';

/** The nspasteboard.org markers clipboard managers honor */
const SENSITIVE_MARKERS = `
pasteboard.setStringForType($(''), $('org.nspasteboard.ConcealedType'));
pasteboard.setStringForType($(''), $('org.nspasteboard.TransientType'));`;

/** The text goes in through `JSON.stringify` and the script over stdin, so it never reaches a command line */
export function buildCopyScript(text: string, { sensitive = false }: CopyOptions = {}): string {
  const markers = sensitive ? SENSITIVE_MARKERS : '';

  return `
ObjC.import('AppKit');
const pasteboard = $.NSPasteboard.generalPasteboard;
pasteboard.clearContents;
pasteboard.setStringForType($(${JSON.stringify(text)}), $.NSPasteboardTypeString);${markers}
`;
}

export async function copyToClipboard(text: string, options: CopyOptions = {}): Promise<void> {
  const script = buildCopyScript(text, options);

  await runAppleScript(script, { language: 'JavaScript' });
}
