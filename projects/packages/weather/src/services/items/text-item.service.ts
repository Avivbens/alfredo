import type { AlfredListItem } from 'fast-alfred';

export function toItemText(
  title: string,
  subtitle: string,
  largetype = `${title}\n${subtitle}`,
): AlfredListItem['text'] {
  return { copy: `${title} · ${subtitle}`, largetype };
}

export function toTextItem(title: string, subtitle: string, largetype?: string): AlfredListItem {
  return { title, subtitle, valid: false, text: toItemText(title, subtitle, largetype) };
}
