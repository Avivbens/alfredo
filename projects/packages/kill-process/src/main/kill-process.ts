import { FastAlfred } from 'fast-alfred';
import { callbackPayloadSchema } from '../models/callback-payload.model';

(async () => {
  const alfredClient = new FastAlfred();

  try {
    const { pid, shouldForceKill } = callbackPayloadSchema.parse(JSON.parse(alfredClient.input));

    /** Signalling from node runs no `kill` command, so nothing in the payload reaches a shell. */
    process.kill(pid, shouldForceKill ? 'SIGKILL' : 'SIGTERM');
  } catch (error) {
    alfredClient.error(error);
  }
})();
