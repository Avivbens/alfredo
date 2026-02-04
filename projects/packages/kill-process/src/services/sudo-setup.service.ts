import { existsSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { $ } from 'zurk';

/**
 * Checks if passwordless sudo is configured for powermetrics
 * @returns true if passwordless sudo is configured, false otherwise
 */
async function checkPasswordlessSudo(): Promise<boolean> {
  try {
    // Check if sudoers file exists
    const sudoersPath = '/etc/sudoers.d/powermetrics';
    if (!existsSync(sudoersPath)) {
      return false;
    }

    // Try to run powermetrics with sudo and check if it prompts for password
    const { stdout, stderr } = await $({
      timeout: 1000,
      nothrow: true,
    })`powermetrics --help`;

    return !stderr.includes('password is required') && !stderr.includes('a password is required');
  } catch (error) {
    // Timeout or error means password is required
    return false;
  }
}

/**
 * Sets up passwordless sudo for powermetrics
 * @returns Result object with success status and optional error message
 */
async function setupPasswordlessSudo(): Promise<{ success: boolean; error?: string }> {
  try {
    const username = homedir().split('/').pop();
    if (!username) {
      return {
        success: false,
        error: 'Could not determine username',
      };
    }

    const sudoersContent = `${username} ALL=(root) NOPASSWD: /usr/bin/powermetrics\n`;
    const sudoersPath = '/etc/sudoers.d/powermetrics';

    const tempFile = join(tmpdir(), `powermetrics-sudoers-${Date.now()}`);
    writeFileSync(tempFile, sudoersContent, { mode: 0o440 });

    /**
     * Use sudo to move the temp file to sudoers.d
     * This will prompt for password once
     */
    const { stderr } = await $({
      timeout: 30000, // 30 seconds for user to enter password
      nothrow: true,
    })`sudo install -m 0440 -o root -g wheel ${tempFile} ${sudoersPath}`;

    if (stderr && stderr.includes('Sorry')) {
      return {
        success: false,
        error: 'Authentication failed or insufficient permissions',
      };
    }

    // Verify the setup worked
    const isConfigured = await checkPasswordlessSudo();
    if (!isConfigured) {
      return {
        success: false,
        error: 'Setup completed but verification failed',
      };
    }

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Failed to setup passwordless sudo: ${errorMessage}`,
    };
  }
}

/**
 * Ensures passwordless sudo is configured, setting it up if necessary
 * @returns Result object with success status and optional error message
 */
export async function ensurePasswordlessSudo(): Promise<{
  success: boolean;
  error?: string;
  setupPerformed?: boolean;
}> {
  // First check if it's already configured
  const isConfigured = await checkPasswordlessSudo();
  if (isConfigured) {
    return { success: true, setupPerformed: false };
  }

  // If not configured, attempt to set it up
  const setupResult = await setupPasswordlessSudo();
  return {
    ...setupResult,
    setupPerformed: setupResult.success,
  };
}
