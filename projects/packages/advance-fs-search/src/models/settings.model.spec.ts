import { homedir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';
import { SettingsSchema } from './settings.model';

describe('settings.model', () => {
  describe('SettingsSchema', () => {
    it('should fall back to the defaults for fields Alfred does not pass', () => {
      expect(SettingsSchema.parse({})).toEqual({
        sliceAmount: 10,
        search: {
          type: 'all',
          onlyIn: [],
          forceInclude: [],
          excludePaths: [],
          excludeGit: false,
          excludeHidden: false,
          gitReposOnly: false,
          excludeNodeModules: false,
          searchWorktrees: false,
        },
      });
    });

    it('should read the values Alfred passes from the configuration fields', () => {
      const settings = SettingsSchema.parse({
        slice_amount: '25',
        target_type: 'folder',
        only_in: '~/dev\n\n  /opt  ',
        exclude_git: '1',
        search_worktrees: '0',
      });

      expect(settings).toMatchObject({
        sliceAmount: 25,
        search: { type: 'folder', onlyIn: [`${homedir()}/dev`, '/opt'], excludeGit: true, searchWorktrees: false },
      });
    });

    it('should reject a target type the popup never offers', () => {
      expect(() => SettingsSchema.parse({ target_type: 'symlink' })).toThrow(ZodError);
    });
  });
});
