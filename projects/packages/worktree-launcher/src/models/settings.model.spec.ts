import { homedir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { settingsSchema } from './settings.model';

describe('settings.model', () => {
  describe('settingsSchema', () => {
    it('should fall back to the defaults for fields Alfred does not pass', () => {
      expect(settingsSchema.parse({})).toEqual({
        prs_keyword: 'wt',
        new_task_keyword: 'wtn',
        repo_roots: [`${homedir()}/dev`],
        scan_depth: 3,
        editor_app: 'vscode',
        terminal_app: 'native',
        agent_command: 'claude',
        agent_resume_args: '--continue',
        install_after_create: true,
        slice_amount: 20,
      });
    });

    it('should read the values Alfred passes from the configuration fields', () => {
      const settings = settingsSchema.parse({
        repo_roots: '~/code\n/opt/src',
        scan_depth: '2',
        editor_app: 'cursor',
        terminal_app: 'iterm',
        install_after_create: '0',
      });

      expect(settings).toMatchObject({
        repo_roots: [`${homedir()}/code`, '/opt/src'],
        scan_depth: 2,
        editor_app: 'cursor',
        terminal_app: 'iterm',
        install_after_create: false,
      });
    });
  });
});
