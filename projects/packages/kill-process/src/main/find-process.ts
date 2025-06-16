import type { AlfredListItem } from 'fast-alfred';
import { FastAlfred } from 'fast-alfred';
import psList from 'ps-list';
import { Variables } from '../common/variables.enum';
import { CallbackPayload } from '../models/callback-payload.model';
import { searchProcess } from '../services/search.service';

(async () => {
  const alfredClient = new FastAlfred();

  const sliceAmount: number = alfredClient.env.getEnv(Variables.SLICE_AMOUNT, { defaultValue: 10, parser: Number });

  const fuzzyThreshold: number = alfredClient.env.getEnv(Variables.FUZZY_THRESHOLD, {
    defaultValue: 0.4,
    parser: (input) => Number(input) / 10,
  });

  try {
    const processes = await psList();

    const filteredProcesses = await searchProcess(processes, alfredClient.input, sliceAmount, fuzzyThreshold);

    const items: AlfredListItem[] = filteredProcesses.map(({ name, pid, cmd }) => {
      const subtitle = `PID: ${pid} | CMD: ${cmd}`;

      return {
        title: name,
        subtitle,
        arg: String(pid) satisfies CallbackPayload,
        uid: subtitle,
      };
    });

    const sliced = items.slice(0, sliceAmount);

    alfredClient.output({ items: sliced, rerun: 1 });
  } catch (error) {
    alfredClient.error(error);
  }
})();
