import { $ } from 'zurk';

export async function getActiveApp(): Promise<string> {
  const { stdout, stderr } =
    await $`osascript -e 'tell application "System Events" to get bundle identifier of first application process whose frontmost is true'`;

  if (stderr) {
    throw new Error(`Error: ${stderr}`);
  }

  const appName = stdout.trim();
  return appName;
}
