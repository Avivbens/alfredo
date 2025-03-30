import { FastAlfred } from 'fast-alfred';
import { $ } from 'zurk';

(async () => {
  const alfredClient = new FastAlfred();

  const {
    profile,
    url,
    incognito = false,
  }: { profile: string; url: string; incognito: boolean } = JSON.parse(alfredClient.input);

  const incognitoStr = incognito ? '--incognito' : '';
  await $`open -g -na 'Google Chrome' --args ${incognitoStr} --profile-directory=${profile} ${url}`;
})();
