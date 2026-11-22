import { runAppleScript } from '@alfredo/run-applescript';

/**
 * The nspasteboard.org markers tell clipboard managers, Alfred's history included, not to record the item.
 * The text sits inside the script, which `runAppleScript` pipes over stdin, so it never reaches a command line.
 */
export function buildConcealedCopyScript(text: string): string {
  return `
ObjC.import('AppKit');
const pasteboard = $.NSPasteboard.generalPasteboard;
pasteboard.clearContents;
pasteboard.setStringForType($(${JSON.stringify(text)}), $.NSPasteboardTypeString);
pasteboard.setStringForType($(''), $('org.nspasteboard.ConcealedType'));
pasteboard.setStringForType($(''), $('org.nspasteboard.TransientType'));
`;
}

export async function copyConcealed(text: string): Promise<void> {
  const script = buildConcealedCopyScript(text);

  await runAppleScript(script, { language: 'JavaScript' });
}
