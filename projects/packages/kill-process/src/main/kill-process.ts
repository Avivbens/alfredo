import { FastAlfred } from 'fast-alfred';
import { $ } from 'zurk';
import { CallbackPayload } from '../models/callback-payload.model';

(async () => {
  const alfredClient = new FastAlfred();

  const { pid, shouldForceKill }: CallbackPayload = JSON.parse(alfredClient.input);
  const args = [shouldForceKill ? '-9' : '', String(pid)].filter(Boolean);

  await $({ args })`kill`;
})();
