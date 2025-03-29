import { FastAlfred } from 'fast-alfred';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execPrm = promisify(exec);

(async () => {
  const alfredClient = new FastAlfred();

  const {
    profile,
    url,
    incognito = false,
  }: { profile: string; url: string; incognito: boolean } = JSON.parse(alfredClient.input);

  const command = `open -g -na 'Google Chrome' --args ${
    incognito ? '--incognito' : ''
  } --profile-directory='${profile}' '${url}'`;
  await execPrm(command);
})();
