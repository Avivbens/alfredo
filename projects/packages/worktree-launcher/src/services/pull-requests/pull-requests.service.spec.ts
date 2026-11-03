import { beforeEach, describe, expect, it, vi } from 'vitest';

const { execFile, resolveTool } = vi.hoisted(() => ({ execFile: vi.fn(), resolveTool: vi.fn() }));

vi.mock('node:child_process', () => ({ execFile }));
vi.mock('../system/tools.service', () => ({ resolveTool }));

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

function toNode(number: number, extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    number,
    title: `Layer ${number}`,
    url: `https://github.com/Avivbens/alfredo/pull/${number}`,
    isDraft: false,
    headRefName: `feat/layer-${number}`,
    isCrossRepository: false,
    repository: { nameWithOwner: 'Avivbens/alfredo' },
    ...extra,
  };
}

/** Shaped like stack 68 of Avivbens/alfredo: layer 2 of 4, with one merged and one closed layer. */
function toStackedNode(number: number, position: number): Record<string, unknown> {
  const layers = [
    { position: 1, pullRequest: { ...toNode(67), state: 'OPEN' } },
    { position: 2, pullRequest: { ...toNode(68), state: 'OPEN' } },
    { position: 3, pullRequest: { ...toNode(69), state: 'MERGED' } },
    { position: 4, pullRequest: { ...toNode(70), state: 'CLOSED' } },
  ];

  return toNode(number, { stackEntry: { position }, stack: { number: 68, size: 4, entries: { nodes: layers } } });
}

function toSearchResponse(mine: unknown[]): string {
  return JSON.stringify({ data: { mine: { nodes: mine }, review: { nodes: [] }, assigned: { nodes: [] } } });
}

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

      const { prs } = await loadPullRequests();

      expect(prs.at(-1)).toMatchObject({
        source: 'assigned',
        number: 15287,
        nameWithOwner: 'mirovia-security/backend',
        headRefName: 'POC-29991/schedule-refresh',
      });
      expect(prs.map(({ source }) => source)).toEqual(['mine', 'mine', 'review', 'assigned']);
    });

    it('should carry the stack number, size and position', async () => {
      mockExecFile(toSearchResponse([toStackedNode(68, 2)]));
      const { loadPullRequests } = await import('./pull-requests.service');

      const { prs } = await loadPullRequests();

      expect(prs[0]).toMatchObject({ number: 68, source: 'mine', stack: { number: 68, size: 4, position: 2 } });
    });

    it('should add open layers missing from your lists as stack entries', async () => {
      mockExecFile(toSearchResponse([toStackedNode(68, 2)]));
      const { loadPullRequests } = await import('./pull-requests.service');

      const { prs } = await loadPullRequests();

      expect(prs.map((pr) => [pr.source, pr.number, pr.stack?.position])).toEqual([
        ['mine', 68, 2],
        ['stack', 67, 1],
      ]);
      expect(prs[1]).toMatchObject({
        nameWithOwner: 'avivbens/alfredo',
        headRefName: 'feat/layer-67',
        stack: { number: 68, size: 4, position: 1 },
      });
    });

    it('should drop merged and closed layers', async () => {
      mockExecFile(toSearchResponse([toStackedNode(68, 2)]));
      const { loadPullRequests } = await import('./pull-requests.service');

      const { prs } = await loadPullRequests();

      expect(prs.map(({ number }) => number)).not.toContain(69);
      expect(prs.map(({ number }) => number)).not.toContain(70);
    });

    it('should treat a PR as unstacked when its stack fields fail to parse', async () => {
      const broken = toNode(68, { stackEntry: { position: 'first' }, stack: { number: 68, size: 4, entries: null } });
      mockExecFile(toSearchResponse([broken, toNode(5, { stackEntry: null, stack: null })]));
      const { loadPullRequests } = await import('./pull-requests.service');

      const { prs, issues } = await loadPullRequests();

      expect(issues).toEqual([]);
      expect(prs.map((pr) => [pr.source, pr.number, pr.stack])).toEqual([
        ['mine', 68, undefined],
        ['mine', 5, undefined],
      ]);
    });

    it('should retry once without the stack fields and list plain PRs when the stacked request fails', async () => {
      execFile
        .mockImplementationOnce((_file, _args, callback) => {
          callback(new Error('exit 1'), '', "Field 'stack' doesn't exist on type 'PullRequest'");
        })
        .mockImplementationOnce((_file, _args, callback) => {
          callback(null, toSearchResponse([toNode(5)]), '');
        });
      const { loadPullRequests } = await import('./pull-requests.service');

      const { prs, issues } = await loadPullRequests();

      expect(issues).toEqual([]);
      expect(execFile).toHaveBeenCalledTimes(2);
      expect(execFile.mock.calls[0]?.[1].join(' ')).toContain('stackEntry');
      expect(execFile.mock.calls[1]?.[1].join(' ')).not.toContain('stack');
      expect(prs).toEqual([expect.objectContaining({ number: 5, source: 'mine' })]);
      expect(prs[0]).not.toHaveProperty('stack');
    });

    it('should report the second error when the plain request fails too', async () => {
      execFile
        .mockImplementationOnce((_file, _args, callback) => {
          callback(new Error('exit 1'), '', 'stack unsupported');
        })
        .mockImplementationOnce((_file, _args, callback) => {
          callback(new Error('exit 1'), '', 'network down');
        });
      const { loadPullRequests } = await import('./pull-requests.service');

      expect(await loadPullRequests()).toEqual({
        prs: [],
        issues: [{ kind: 'failed', reason: 'network down' }],
      });
    });

    it('should not retry when gh is not logged in', async () => {
      execFile.mockImplementation((_file, _args, callback) => {
        callback(new Error('exit 4'), '', 'please run:  gh auth login');
      });
      const { loadPullRequests } = await import('./pull-requests.service');

      expect(await loadPullRequests()).toEqual({
        prs: [],
        issues: [{ kind: 'gh-unauthenticated' }],
      });
      expect(execFile).toHaveBeenCalledTimes(1);
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
    it('should look up one PR through gh api graphql with variables', async () => {
      mockExecFile(JSON.stringify({ data: { repository: { pullRequest: toNode(5) } } }));
      const { lookupPullRequest } = await import('./pull-requests.service');

      const { prs, issues } = await lookupPullRequest({
        nameWithOwner: 'avivbens/alfredo',
        number: 5,
      });

      expect(issues).toEqual([]);
      expect(prs).toEqual([
        expect.objectContaining({ number: 5, source: 'lookup', nameWithOwner: 'avivbens/alfredo' }),
      ]);
      const args: string[] = execFile.mock.calls[0]?.[1];
      expect(args.slice(0, 3)).toEqual(['api', 'graphql', '-f']);
      expect(args).toEqual(expect.arrayContaining(['-f', 'owner=avivbens', '-f', 'name=alfredo', '-F', 'number=5']));
      expect(args.find((arg) => arg.startsWith('query='))).not.toContain('avivbens');
    });

    it('should add the open layers of a looked-up PR stack as stack entries', async () => {
      mockExecFile(JSON.stringify({ data: { repository: { pullRequest: toStackedNode(68, 2) } } }));
      const { lookupPullRequest } = await import('./pull-requests.service');

      const { prs } = await lookupPullRequest({
        nameWithOwner: 'avivbens/alfredo',
        number: 68,
      });

      expect(prs.map((pr) => [pr.source, pr.number, pr.stack?.position])).toEqual([
        ['lookup', 68, 2],
        ['stack', 67, 1],
      ]);
    });

    it('should report a failure when the looked-up node is missing required fields', async () => {
      mockExecFile(JSON.stringify({ data: { repository: { pullRequest: { number: 5 } } } }));
      const { lookupPullRequest } = await import('./pull-requests.service');

      const { prs, issues } = await lookupPullRequest({ nameWithOwner: 'a/b', number: 5 });

      expect(prs).toEqual([]);
      expect(issues).toEqual([{ kind: 'failed', reason: expect.any(String) }]);
      expect(execFile).toHaveBeenCalledTimes(2);
    });

    it('should retry a lookup once without the stack fields', async () => {
      execFile
        .mockImplementationOnce((_file, _args, callback) => {
          callback(new Error('exit 1'), '', "Field 'stack' doesn't exist");
        })
        .mockImplementationOnce((_file, _args, callback) => {
          callback(null, JSON.stringify({ data: { repository: { pullRequest: toNode(5) } } }), '');
        });
      const { lookupPullRequest } = await import('./pull-requests.service');

      const { prs, issues } = await lookupPullRequest({ nameWithOwner: 'a/b', number: 5 });

      expect(issues).toEqual([]);
      expect(execFile).toHaveBeenCalledTimes(2);
      expect(execFile.mock.calls[1]?.[1].join(' ')).not.toContain('stack');
      expect(prs).toEqual([expect.objectContaining({ number: 5, source: 'lookup' })]);
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
