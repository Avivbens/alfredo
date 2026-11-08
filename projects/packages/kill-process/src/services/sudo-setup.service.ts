import { existsSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir, userInfo } from 'node:os';
import { join } from 'node:path';
import { $ } from 'zurk';

const SUDOERS_PATH = '/etc/sudoers.d/powermetrics';
export const POWERMETRICS_BIN = '/usr/bin/powermetrics';

/** One 2.5s sample of per-process energy, the only invocation the sudoers rule allows. */
export const POWERMETRICS_ARGS = ['--samplers', 'tasks', '--show-process-energy', '-n', '1', '-i', '2500'];

/** Earlier versions installed the rule without arguments, and it stays until replaced. */
const ARGUMENTLESS_RULE = /(^|[\s,:])\/usr\/bin\/powermetrics\s*(,|$)/m;

/** A rule without arguments also allows `-o <file>`, which writes any file as root, so it names the exact sampling. */
export function toSudoersRule(username: string): string {
  return `${username} ALL=(root) NOPASSWD: ${POWERMETRICS_BIN} ${POWERMETRICS_ARGS.join(' ')}`;
}

/**
 * Builds the one-time command the user must run in a real terminal to enable
 * passwordless `powermetrics`.
 *
 * Kept as a single exported string so the UI can present it verbatim (copyable)
 * when automatic setup isn't possible (see {@link ensurePasswordlessSudo}).
 */
export function getSetupCommand(): string {
  const { username } = userInfo();
  return (
    `echo '${toSudoersRule(username)}' | sudo tee ${SUDOERS_PATH} > /dev/null && ` + `sudo chmod 0440 ${SUDOERS_PATH}`
  );
}

/**
 * `sudo -n -l` answers without running anything or prompting, so the check can neither hang nor
 * start a sample. It passes only once the sampling is allowed and no argument-less rule remains.
 */
async function checkPasswordlessSudo(): Promise<boolean> {
  if (!existsSync(SUDOERS_PATH)) {
    return false;
  }

  const [listing, sampling] = await Promise.all([
    $({ timeout: 2000, nothrow: true })`sudo -n -l`,
    $({ timeout: 2000, nothrow: true })`sudo -n -l ${POWERMETRICS_BIN} ${POWERMETRICS_ARGS}`,
  ]);

  return sampling.status === 0 && !ARGUMENTLESS_RULE.test(listing.stdout);
}

/**
 * Attempts to install the passwordless-sudo rule automatically.
 *
 * This succeeds on devices where `sudo` can authenticate from this context
 * (e.g. a cached credential timestamp or a configured askpass helper). On
 * managed devices with no TTY/askpass, `sudo` errors out immediately (it can't
 * read a password); the zurk timeout is only a hang guard. Either way we
 * confirm the outcome with {@link checkPasswordlessSudo} rather than trusting
 * the install's exit status.
 *
 * The rule is written into a fresh `mkdtemp` directory with an exclusive create, so no other
 * user can plant or swap it, and visudo checks it first, since a broken file locks sudo itself.
 */
async function setupPasswordlessSudo(): Promise<boolean> {
  const { username } = userInfo();
  if (!username) {
    return false;
  }

  const dir = await mkdtemp(join(tmpdir(), 'kill-process-sudoers-'));
  try {
    const ruleFile = join(dir, 'powermetrics');
    await writeFile(ruleFile, `${toSudoersRule(username)}\n`, { mode: 0o440, flag: 'wx' });

    const check = await $({ timeout: 2000, nothrow: true })`/usr/sbin/visudo -cf ${ruleFile}`;
    if (check.status !== 0) {
      return false;
    }

    await $({ timeout: 30000, nothrow: true })`sudo install -m 0440 -o root -g wheel ${ruleFile} ${SUDOERS_PATH}`;

    return await checkPasswordlessSudo();
  } catch {
    return false;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/**
 * Ensures passwordless sudo for `powermetrics` is configured.
 *
 * Order: use the existing rule if present; otherwise try to install it
 * automatically (works on unmanaged devices where sudo can authenticate here);
 * if that can't work (e.g. managed devices with no TTY), return an actionable
 * error plus the exact command the user should run once in Terminal.
 */
export async function ensurePasswordlessSudo(): Promise<{
  success: boolean;
  error?: string;
  setupCommand?: string;
}> {
  if (await checkPasswordlessSudo()) {
    return { success: true };
  }

  if (await setupPasswordlessSudo()) {
    return { success: true };
  }

  return {
    success: false,
    error: 'Battery data needs a one-time setup — run the command below in Terminal, then retry.',
    setupCommand: getSetupCommand(),
  };
}
