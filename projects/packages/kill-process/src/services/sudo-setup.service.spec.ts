import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ensurePasswordlessSudo, getSetupCommand, toSudoersRule } from './sudo-setup.service';

const { zurkTemplateLiteralFn, existsSync, mkdtemp, writeFile, rm } = vi.hoisted(() => ({
  zurkTemplateLiteralFn: vi.fn(),
  existsSync: vi.fn(),
  mkdtemp: vi.fn(),
  writeFile: vi.fn(),
  rm: vi.fn(),
}));

vi.mock('zurk', () => ({ $: vi.fn(() => zurkTemplateLiteralFn) }));
vi.mock('node:fs', () => ({ existsSync }));
vi.mock('node:fs/promises', () => ({ mkdtemp, writeFile, rm }));
vi.mock('node:os', () => ({ tmpdir: () => '/tmp', userInfo: () => ({ username: 'me' }) }));

const SAMPLING = '/usr/bin/powermetrics --samplers tasks --show-process-energy -n 1 -i 2500';

/** Trimmed from `sudo -n -l` on a machine that has the argument-less rule earlier versions installed. */
const BROAD_LISTING = `User me may run the following commands on host:
    (root) NOPASSWD: /usr/bin/pmset
    (root) NOPASSWD: /usr/bin/powermetrics
`;
const NARROW_LISTING = `User me may run the following commands on host:
    (root) NOPASSWD: ${SAMPLING}
`;

function toCommand(pieces: TemplateStringsArray, ...args: unknown[]): string {
  const values = args.map((arg) => (Array.isArray(arg) ? arg.join(' ') : String(arg)));
  return String.raw({ raw: pieces }, ...values);
}

function commands(): string[] {
  return zurkTemplateLiteralFn.mock.calls.map(([pieces, ...args]) => toCommand(pieces, ...args));
}

/** Answers each command the way sudo and visudo would for the given installed rule. */
function mockSudo({
  listing,
  visudoOk = true,
  listingNeedsPassword = false,
  samplingOk = true,
}: {
  listing: () => string;
  visudoOk?: boolean;
  listingNeedsPassword?: boolean;
  samplingOk?: boolean;
}): void {
  zurkTemplateLiteralFn.mockImplementation(async (pieces: TemplateStringsArray, ...args: unknown[]) => {
    const command = toCommand(pieces, ...args);
    if (command.startsWith('sudo -n -l') && listingNeedsPassword) {
      return { status: 1, stdout: '' };
    }

    if (command === 'sudo -n -l') {
      return { status: 0, stdout: listing() };
    }

    if (command.startsWith('sudo -n -l ')) {
      return { status: listing().includes('powermetrics') ? 0 : 1, stdout: '' };
    }

    if (command === `sudo -n ${SAMPLING}`) {
      return { status: samplingOk ? 0 : 1, stdout: '' };
    }

    if (command.startsWith('/usr/sbin/visudo')) {
      return { status: visudoOk ? 0 : 1, stdout: '' };
    }

    return { status: 0, stdout: '' };
  });
}

describe('sudo-setup.service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    existsSync.mockReturnValue(true);
    mkdtemp.mockResolvedValue('/tmp/kill-process-sudoers-abc');
  });

  describe('toSudoersRule', () => {
    it('should name the exact sampling arguments, since a bare powermetrics rule also allows `-o` to write any file as root', () => {
      expect(toSudoersRule('me')).toBe(`me ALL=(root) NOPASSWD: ${SAMPLING}`);
    });
  });

  describe('getSetupCommand', () => {
    it('should install the same rule the automatic setup writes', () => {
      expect(getSetupCommand()).toContain(`echo 'me ALL=(root) NOPASSWD: ${SAMPLING}' | sudo tee`);
    });
  });

  describe('ensurePasswordlessSudo', () => {
    it('should accept a rule limited to the sampling arguments without reinstalling it', async () => {
      mockSudo({ listing: () => NARROW_LISTING });

      await expect(ensurePasswordlessSudo()).resolves.toEqual({ success: true });
      expect(commands().some((command) => command.includes('install'))).toBe(false);
    });

    it('should replace the argument-less rule earlier versions installed', async () => {
      let installed = BROAD_LISTING;
      mockSudo({ listing: () => installed });
      writeFile.mockImplementation(async () => {
        installed = NARROW_LISTING;
      });

      await expect(ensurePasswordlessSudo()).resolves.toEqual({ success: true });
      expect(commands()).toContain(
        'sudo install -m 0440 -o root -g wheel /tmp/kill-process-sudoers-abc/powermetrics /etc/sudoers.d/powermetrics',
      );
    });

    it('should run the sampling itself when the host needs a password even to list rules', async () => {
      mockSudo({ listing: () => NARROW_LISTING, listingNeedsPassword: true });

      await expect(ensurePasswordlessSudo()).resolves.toEqual({ success: true });
      expect(commands()).toContain(`sudo -n ${SAMPLING}`);
      expect(commands().some((command) => command.startsWith('sudo install'))).toBe(false);
    });

    it('should ask for the setup when the listing needs a password and the sampling is refused too', async () => {
      mockSudo({ listing: () => '', listingNeedsPassword: true, samplingOk: false });

      await expect(ensurePasswordlessSudo()).resolves.toMatchObject({
        success: false,
        setupCommand: getSetupCommand(),
      });
    });

    it('should write the rule into a private directory, check it with visudo before installing, and remove it', async () => {
      mockSudo({ listing: () => '' });
      existsSync.mockReturnValue(false);

      await ensurePasswordlessSudo();

      expect(mkdtemp).toHaveBeenCalledWith('/tmp/kill-process-sudoers-');
      expect(writeFile).toHaveBeenCalledWith(
        '/tmp/kill-process-sudoers-abc/powermetrics',
        `me ALL=(root) NOPASSWD: ${SAMPLING}\n`,
        { mode: 0o440, flag: 'wx' },
      );
      const visudo = commands().findIndex((command) => command.startsWith('/usr/sbin/visudo -cf'));
      const install = commands().findIndex((command) => command.startsWith('sudo install'));
      expect(visudo).toBeGreaterThanOrEqual(0);
      expect(visudo).toBeLessThan(install);
      expect(rm).toHaveBeenCalledWith('/tmp/kill-process-sudoers-abc', { recursive: true, force: true });
    });

    it('should not install a rule visudo rejects, and fall back to the manual command', async () => {
      mockSudo({ listing: () => '', visudoOk: false });
      existsSync.mockReturnValue(false);

      const result = await ensurePasswordlessSudo();

      expect(commands().some((command) => command.startsWith('sudo install'))).toBe(false);
      expect(result).toMatchObject({ success: false, setupCommand: getSetupCommand() });
      expect(rm).toHaveBeenCalled();
    });
  });
});
