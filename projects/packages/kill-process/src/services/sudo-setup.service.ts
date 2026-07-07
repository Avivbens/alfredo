import { existsSync, writeFileSync } from 'node:fs';
import { tmpdir, userInfo } from 'node:os';
import { join } from 'node:path';
import { $ } from 'zurk';

const SUDOERS_PATH = '/etc/sudoers.d/powermetrics';
const POWERMETRICS_BIN = '/usr/bin/powermetrics';

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
    `echo '${username} ALL=(root) NOPASSWD: ${POWERMETRICS_BIN}' | sudo tee ${SUDOERS_PATH} > /dev/null && ` +
    `sudo chmod 0440 ${SUDOERS_PATH}`
  );
}

/**
 * Checks whether `sudo powermetrics` runs WITHOUT prompting for a password.
 *
 * Uses `sudo -n` (non-interactive): sudo exits non-zero and never blocks on a
 * prompt when a password would be required, so this can neither hang nor pop a
 * dialog. Unlike a bare `powermetrics --help` (which succeeds for any user and
 * therefore never exercises sudo), this actually tests the privileged path the
 * battery feature depends on.
 */
async function checkPasswordlessSudo(): Promise<boolean> {
  if (!existsSync(SUDOERS_PATH)) {
    return false;
  }

  const { status } = await $({
    timeout: 2000,
    nothrow: true,
  })`sudo -n ${POWERMETRICS_BIN} --help`;

  return status === 0;
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
 */
async function setupPasswordlessSudo(): Promise<boolean> {
  try {
    const { username } = userInfo();
    if (!username) {
      return false;
    }

    const sudoersContent = `${username} ALL=(root) NOPASSWD: ${POWERMETRICS_BIN}\n`;
    const tempFile = join(tmpdir(), `powermetrics-sudoers-${Date.now()}`);
    writeFileSync(tempFile, sudoersContent, { mode: 0o440 });

    /**
     * Move the rule into place as root. Prompts for a password once where the
     * environment allows it (30s window); fails fast where it doesn't.
     */
    await $({
      timeout: 30000,
      nothrow: true,
    })`sudo install -m 0440 -o root -g wheel ${tempFile} ${SUDOERS_PATH}`;

    return checkPasswordlessSudo();
  } catch {
    return false;
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
