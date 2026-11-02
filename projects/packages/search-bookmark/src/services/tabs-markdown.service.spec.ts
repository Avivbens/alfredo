import { describe, expect, it } from 'vitest';
import type { ChromeWindow } from '../models/chrome-tabs.schema';
import { toAllWindowsMarkdown, toMarkdownLink, toWindowMarkdown } from './tabs-markdown.service';

describe('tabs-markdown.service', () => {
  const window1: ChromeWindow = {
    id: 1,
    activeTabIndex: 1,
    tabs: [
      { title: 'A', url: 'https://a.dev' },
      { title: 'B', url: 'https://b.dev' },
    ],
  };
  const window2: ChromeWindow = { id: 2, activeTabIndex: 1, tabs: [{ title: 'C', url: 'https://c.dev' }] };

  describe('toMarkdownLink', () => {
    it('should write a plain link', () => {
      expect(toMarkdownLink({ title: 'Alfredo', url: 'https://github.com/avivbens/alfredo' })).toBe(
        '[Alfredo](https://github.com/avivbens/alfredo)',
      );
    });

    it('should escape brackets and backslashes in the title so the link stays valid', () => {
      expect(toMarkdownLink({ title: 'fix: [POC-1] a\\b', url: 'https://x.dev' })).toBe(
        '[fix: \\[POC-1\\] a\\\\b](https://x.dev)',
      );
    });

    it('should percent-encode parentheses in the url so the link does not end early', () => {
      expect(toMarkdownLink({ title: 'Lisp', url: 'https://en.wikipedia.org/wiki/Lisp_(programming_language)' })).toBe(
        '[Lisp](https://en.wikipedia.org/wiki/Lisp_%28programming_language%29)',
      );
    });

    it('should fall back to the url when the title is empty', () => {
      expect(toMarkdownLink({ title: '', url: 'https://x.dev' })).toBe('[https://x.dev](https://x.dev)');
    });
  });

  describe('toWindowMarkdown', () => {
    it('should write one list line per tab', () => {
      expect(toWindowMarkdown(window1)).toBe('- [A](https://a.dev)\n- [B](https://b.dev)');
    });
  });

  describe('toAllWindowsMarkdown', () => {
    it('should group each window under a numbered heading', () => {
      expect(toAllWindowsMarkdown([window1, window2])).toBe(
        '### Window 1\n\n- [A](https://a.dev)\n- [B](https://b.dev)\n\n### Window 2\n\n- [C](https://c.dev)',
      );
    });
  });
});
