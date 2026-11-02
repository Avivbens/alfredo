import type { AlfredScriptFilter } from 'fast-alfred';
import { FastAlfred } from 'fast-alfred';
import { getPorts } from 'occupied-ports';
import { registerUpdater } from '@alfredo/updater';
import { CallbackPayload } from '../models/callback-payload.model';
import { SettingsSchema } from '../models/settings.model';
import { searchPort } from '../services/search.service';

(async () => {
  const alfredClient = new FastAlfred();
  alfredClient.updates(registerUpdater('kill-process'));

  const { sliceAmount, fuzzyThreshold, rerunInterval } = alfredClient.env.parse(SettingsSchema);

  try {
    const ports = await getPorts();

    const filteredPorts = await searchPort(ports, alfredClient.input, sliceAmount, fuzzyThreshold);

    const items: AlfredScriptFilter['items'] = filteredPorts.map(({ name, pid, port }) => {
      const subtitle = `Port: ${port} | PID: ${pid}`;

      const payload: CallbackPayload = {
        pid,
        name,
        shouldForceKill: false,
      };

      return {
        title: name,
        subtitle,
        arg: JSON.stringify(payload, null, 2),
        uid: subtitle,
      };
    });

    const sliced = items.slice(0, sliceAmount);

    /** Alfred keeps the selected row across a rerun only with `skipknowledge` and a stable uid, which port and PID give. */
    alfredClient.output({ items: sliced, rerun: rerunInterval, skipknowledge: true });
  } catch (error) {
    alfredClient.error(error);
  }
})();
