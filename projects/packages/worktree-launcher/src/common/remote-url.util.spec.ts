import { describe, expect, it } from 'vitest';
import { toNameWithOwner } from './remote-url.util';

describe('remote-url.util', () => {
  describe('toNameWithOwner', () => {
    it.each([
      ['git@github.com:Owner/Repo.git'],
      ['https://github.com/owner/repo'],
      ['https://github.com/owner/repo.git'],
      ['ssh://git@github.com/owner/repo.git'],
      ['https://www.github.com/owner/repo'],
      ['git@github.com:Owner/Repo.GIT'],
      ['https://github.com/owner/Repo.GIT'],
    ])('should give a lowercased owner/repo for %s', (url) => {
      expect(toNameWithOwner(url)).toBe('owner/repo');
    });

    it.each([
      [''],
      ['junk'],
      ['https://gitlab.com/owner/repo.git'],
      ['git@gitlab.com:owner/repo.git'],
      ['https://github.example.com/owner/repo'],
      ['git@github.example.com:owner/repo.git'],
      ['https://github.com/owner'],
      ['/local/path'],
    ])('should give null for %j', (url) => {
      expect(toNameWithOwner(url)).toBeNull();
    });
  });
});
