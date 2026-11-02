import { FastAlfred } from 'fast-alfred';
import { focusTabArgsSchema } from '../models/chrome-tabs.schema';
import { focusChromeTab } from '../services/chrome-tabs.service';

(async () => {
  const alfredClient = new FastAlfred();

  const { windowId, tabIndex } = focusTabArgsSchema.parse(JSON.parse(alfredClient.input));
  await focusChromeTab(windowId, tabIndex);
})();
