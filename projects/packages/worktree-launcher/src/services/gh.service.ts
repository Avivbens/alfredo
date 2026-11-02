import { execFile } from 'node:child_process';

/** The error keeps gh's stderr, because the message alone rarely says what went wrong. */
export function runGh(gh: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(gh, args, (error, stdout, stderr) => {
      if (error) {
        const failure = Object.assign(error, { stderr: String(stderr ?? '') });
        reject(failure);
        return;
      }
      resolve(String(stdout));
    });
  });
}
