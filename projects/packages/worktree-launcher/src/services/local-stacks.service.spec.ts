import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readLocalStacks } from './local-stacks.service';

/** Trimmed from a real `.git/gh-stack`: one stack with a `number`, one local-only stack without. */
const GH_STACK_FILE = {
  schemaVersion: 1,
  repository: 'github.com:Avivbens/alfredo',
  stacks: [
    {
      id: '2878250',
      number: 50,
      trunk: { branch: 'master', head: '75fc0055a4aef66137056a56fd0c39ce52eb5569' },
      branches: [
        {
          branch: 'migration/adopt-fast-alfred-2-8',
          head: 'f5825b9772422b407777342c33c7902954f1229b',
          base: '75fc0055a4aef66137056a56fd0c39ce52eb5569',
          pullRequest: {
            number: 48,
            id: 'PR_kwDOOQcLpM8AAAABL9nnGA',
            url: 'https://github.com/Avivbens/alfredo/pull/48',
          },
        },
        {
          branch: 'migration/workflow-settings-schemas',
          head: '6ee040c5559c76de1d448ae39edbd7b3f338c942',
          base: 'f5825b9772422b407777342c33c7902954f1229b',
          pullRequest: {
            number: 49,
            id: 'PR_kwDOOQcLpM8AAAABL-IeMQ',
            url: 'https://github.com/Avivbens/alfredo/pull/49',
          },
        },
      ],
    },
    {
      trunk: { branch: 'master', head: '995f9fdc7343f22d5ee068ea6d0c03e5ad99c01c' },
      branches: [
        {
          branch: 'feat/worktree-libs-git',
          head: 'f540b19bb87358446e3bb34331f4528b454a65f0',
          base: 'eb7202f025283191d15c077d21573a17e2895cdc',
        },
        { branch: 'feat/worktree-launcher-stacks', base: '44be80dbb27e53bc3076a413b4a840fec5205d6b' },
      ],
    },
  ],
};

describe('local-stacks.service', () => {
  let repo: string;

  beforeEach(async () => {
    repo = await mkdtemp(join(tmpdir(), 'local-stacks-'));
    await mkdir(join(repo, '.git'));
  });

  afterEach(async () => {
    await rm(repo, { recursive: true, force: true });
  });

  describe('readLocalStacks', () => {
    it('should read stacks in layer order, with PR numbers only where a PR exists', async () => {
      await writeFile(join(repo, '.git', 'gh-stack'), JSON.stringify(GH_STACK_FILE));

      expect(await readLocalStacks(repo)).toEqual([
        {
          number: 50,
          branches: [
            { branch: 'migration/adopt-fast-alfred-2-8', prNumber: 48 },
            { branch: 'migration/workflow-settings-schemas', prNumber: 49 },
          ],
        },
        {
          number: undefined,
          branches: [
            { branch: 'feat/worktree-libs-git', prNumber: undefined },
            { branch: 'feat/worktree-launcher-stacks', prNumber: undefined },
          ],
        },
      ]);
    });

    it('should return no stacks for an unknown schemaVersion', async () => {
      await writeFile(join(repo, '.git', 'gh-stack'), JSON.stringify({ ...GH_STACK_FILE, schemaVersion: 2 }));

      expect(await readLocalStacks(repo)).toEqual([]);
    });

    it('should return no stacks when the file is missing', async () => {
      expect(await readLocalStacks(repo)).toEqual([]);
    });

    it('should return no stacks when the file is not JSON', async () => {
      await writeFile(join(repo, '.git', 'gh-stack'), 'not json');

      expect(await readLocalStacks(repo)).toEqual([]);
    });
  });
});
