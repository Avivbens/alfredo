import { FastAlfred } from 'fast-alfred';
import { registerUpdater } from '@alfredo/updater';
import { Variables } from '../common/variables.enum';
import { orderByPreference } from '../services/device-order.service';
import { toIssueItem } from '../services/issue-item.service';
import { searchTextOf, toOutputItem } from '../services/output-item.service';
import { loadOutputs } from '../services/output-loader.service';

(async () => {
  const alfredClient = new FastAlfred();
  alfredClient.updates(registerUpdater('toggle-audio-output'));

  try {
    const preferredNames: string[] = alfredClient.env.getEnv(Variables.OUTPUTS_LIST, {
      defaultValue: [],
      parser: (input) =>
        input
          .split('\n')
          .map((item) => item.trim())
          .filter(Boolean),
    });

    const { entries, issues } = await loadOutputs();
    const ordered = orderByPreference(entries, preferredNames);
    const matched = alfredClient.inputMatches(ordered, searchTextOf);

    /** Alfred reorders results by its own learning unless told otherwise, which would override the config order. */
    alfredClient.output({
      items: [...matched.map(toOutputItem), ...issues.map((issue) => toIssueItem(issue, alfredClient.icons))],
      skipknowledge: true,
    });
  } catch (error) {
    alfredClient.error(error);
  }
})();
