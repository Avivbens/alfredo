import { beforeEach, describe, expect, it, vi } from 'vitest';

const { execFile, resolveTool } = vi.hoisted(() => ({ execFile: vi.fn(), resolveTool: vi.fn() }));

vi.mock('node:child_process', () => ({ execFile }));
vi.mock('./tools.service', () => ({ resolveTool }));

/** Trimmed from a real `gh api graphql` response; titles, repos and branches replaced with neutral values. */
const GRAPHQL_RESPONSE = {
  data: {
    mine: {
      nodes: [
        {
          number: 3,
          title: 'Add worktree launcher',
          url: 'https://github.com/Avivbens/alfredo/pull/3',
          isDraft: true,
          headRefName: 'feat/launcher',
          isCrossRepository: false,
          repository: { nameWithOwner: 'Avivbens/alfredo' },
        },
        {
          number: 2,
          title: 'Fix kill-process',
          url: 'https://github.com/Avivbens/alfredo/pull/2',
          isDraft: false,
          headRefName: 'fix/kill',
          isCrossRepository: false,
          repository: { nameWithOwner: 'Avivbens/alfredo' },
        },
      ],
    },
    review: {
      nodes: [
        {
          number: 9,
          title: 'Bump deps',
          url: 'https://github.com/Avivbens/fast-alfred/pull/9',
          isDraft: false,
          headRefName: 'chore/deps',
          isCrossRepository: true,
          repository: { nameWithOwner: 'Avivbens/fast-alfred' },
        },
      ],
    },
    assigned: {
      nodes: [
        {
          number: 15287,
          title: 'Refresh schedules',
          url: 'https://github.com/Mirovia-Security/backend/pull/15287',
          isDraft: false,
          headRefName: 'POC-29991/schedule-refresh',
          isCrossRepository: false,
          repository: { nameWithOwner: 'Mirovia-Security/backend' },
        },
      ],
    },
  },
};

function mockExecFile(stdout: string): void {
  execFile.mockImplementation((_file, _args, callback) => {
    callback(null, stdout, '');
  });
}

describe('pull-requests.service', () => {
  beforeEach(() => {
    execFile.mockReset();
    resolveTool.mockResolvedValue('/opt/homebrew/bin/gh');
  });

  describe('loadPullRequests', () => {
    it("should flatten mine, review then assigned, keeping gh's order", async () => {
      mockExecFile(JSON.stringify(GRAPHQL_RESPONSE));
      const { loadPullRequests } = await import('./pull-requests.service');

      const { prs, issues } = await loadPullRequests();

      expect(issues).toEqual([]);
      expect(prs.map((pr) => [pr.source, pr.number])).toEqual([
        ['mine', 3],
        ['mine', 2],
        ['review', 9],
        ['assigned', 15287],
      ]);
      expect(prs[0]).toMatchObject({ nameWithOwner: 'avivbens/alfredo', isDraft: true, headRefName: 'feat/launcher' });
      expect(execFile).toHaveBeenCalledWith(
        '/opt/homebrew/bin/gh',
        ['api', 'graphql', '-f', expect.stringMatching(/^query=query \{/)],
        expect.any(Function),
      );
    });

    it('should list assigned pull requests after review requests, tagged assigned', async () => {
      mockExecFile(JSON.stringify(GRAPHQL_RESPONSE));
      const { loadPullRequests } = await import('./pull-requests.service');

      const { prs } = await loadPullRequests('/opt/homebrew/bin/gh');

      expect(prs.at(-1)).toMatchObject({
        source: 'assigned',
        number: 15287,
        nameWithOwner: 'mirovia-security/backend',
        headRefName: 'POC-29991/schedule-refresh',
      });
      expect(prs.map(({ source }) => source)).toEqual(['mine', 'mine', 'review', 'assigned']);
    });

    it('should report gh-missing without spawning', async () => {
      resolveTool.mockResolvedValue(null);
      const { loadPullRequests } = await import('./pull-requests.service');

      expect(await loadPullRequests()).toEqual({ prs: [], issues: [{ kind: 'gh-missing' }] });
      expect(execFile).not.toHaveBeenCalled();
    });

    it("should report gh-unauthenticated from gh's stderr", async () => {
      execFile.mockImplementation((_file, _args, callback) => {
        callback(new Error('exit 4'), '', 'To get started with GitHub CLI, please run:  gh auth login');
      });
      const { loadPullRequests } = await import('./pull-requests.service');

      expect(await loadPullRequests()).toEqual({
        prs: [],
        issues: [{ kind: 'gh-unauthenticated' }],
      });
    });

    it('should report any other failure with its trimmed stderr', async () => {
      execFile.mockImplementation((_file, _args, callback) => {
        callback(new Error('exit 1'), '', 'network down\n');
      });
      const { loadPullRequests } = await import('./pull-requests.service');

      expect(await loadPullRequests()).toEqual({
        prs: [],
        issues: [{ kind: 'failed', reason: 'network down' }],
      });
    });

    it('should report unparseable output as a failure instead of throwing', async () => {
      mockExecFile('not json');
      const { loadPullRequests } = await import('./pull-requests.service');

      const { prs, issues } = await loadPullRequests();

      expect(prs).toEqual([]);
      expect(issues).toEqual([{ kind: 'failed', reason: expect.any(String) }]);
    });
  });

  describe('lookupPullRequest', () => {
    it('should mark a looked-up PR with source lookup', async () => {
      mockExecFile(
        JSON.stringify({
          number: 5,
          title: 'Neutral title',
          url: 'https://github.com/Avivbens/alfredo/pull/5',
          isDraft: false,
          headRefName: 'feat/x',
          isCrossRepository: false,
        }),
      );
      const { lookupPullRequest } = await import('./pull-requests.service');

      const { prs, issues } = await lookupPullRequest({
        nameWithOwner: 'avivbens/alfredo',
        number: 5,
      });

      expect(issues).toEqual([]);
      expect(prs).toEqual([
        expect.objectContaining({ number: 5, source: 'lookup', nameWithOwner: 'avivbens/alfredo' }),
      ]);
      expect(execFile).toHaveBeenCalledWith(
        '/opt/homebrew/bin/gh',
        [
          'pr',
          'view',
          '5',
          '--repo',
          'avivbens/alfredo',
          '--json',
          'number,title,url,isDraft,headRefName,isCrossRepository',
        ],
        expect.any(Function),
      );
    });

    it('should report gh-missing without spawning', async () => {
      resolveTool.mockResolvedValue(null);
      const { lookupPullRequest } = await import('./pull-requests.service');

      expect(await lookupPullRequest({ nameWithOwner: 'a/b', number: 1 })).toEqual({
        prs: [],
        issues: [{ kind: 'gh-missing' }],
      });
      expect(execFile).not.toHaveBeenCalled();
    });
  });
});
