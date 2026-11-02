import type { ChromeTab, ChromeWindow } from '../models/chrome-tabs.schema';

export function toMarkdownLink({ title, url }: ChromeTab): string {
  const label = (title || url).replace(/[\\[\]]/g, '\\$&');
  const href = url.replace(/\(/g, '%28').replace(/\)/g, '%29');

  return `[${label}](${href})`;
}

export function toWindowMarkdown({ tabs }: ChromeWindow): string {
  return tabs.map((tab) => `- ${toMarkdownLink(tab)}`).join('\n');
}

export function toAllWindowsMarkdown(windows: ChromeWindow[]): string {
  return windows.map((window, index) => `### Window ${index + 1}\n\n${toWindowMarkdown(window)}`).join('\n\n');
}
