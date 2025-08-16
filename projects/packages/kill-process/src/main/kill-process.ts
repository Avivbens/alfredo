import { FastAlfred } from 'fast-alfred';
import { $ } from 'zurk';
import { CallbackPayload } from '../models/callback-payload.model';

(async () => {
  const alfredClient = new FastAlfred();

  try {
    const { pid, shouldForceKill }: CallbackPayload = JSON.parse(alfredClient.input);
    const args = [shouldForceKill ? '-9' : '', String(pid)].filter(Boolean);

    const { stderr } = await $({ args, nothrow: true })`kill`;
    if (stderr) {
      throw new Error(stderr);
    }
  } catch (error) {
    alfredClient.error(error);
  }
})();
