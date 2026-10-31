import type { AlfredListItem } from 'fast-alfred';
import { FastAlfred } from 'fast-alfred';
import { registerUpdater } from '@alfredo/updater';
import { LANGUAGE_DELIMITER } from '../../common/defaults.constants';
import { SettingsSchema } from '../../models/settings.model';

(async () => {
  const alfredClient = new FastAlfred();
  alfredClient.updates(registerUpdater('text-transformer'));

  const input = alfredClient.input;
  if (input.trim()) {
    return;
  }

  /**
   * Show predefined languages for easy selection
   */
  const { translateLanguages: languages } = alfredClient.env.parse(SettingsSchema);

  const items: AlfredListItem[] = languages.map((language) => ({
    title: language,
    subtitle: `Translate to ${language}`,
    arg: `${language}${LANGUAGE_DELIMITER} `,
  }));

  alfredClient.output({ items });
  return;
})();
