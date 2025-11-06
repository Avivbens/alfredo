import type { AlfredListItem } from 'fast-alfred';
import { FastAlfred } from 'fast-alfred';
import { registerUpdater } from '@alfredo/updater';
import { LANGUAGE_DELIMITER } from '../../common/defaults.constants';
import { Variables } from '../../common/variables.enum';

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
  const languages = alfredClient.env.getEnv<string[]>(Variables.TRANSLATE_LANGUAGES, {
    defaultValue: ['English', 'Spanish', 'French'],
    parser: (value) => value.split(',').map((lang) => lang.trim()),
  });

  const items: AlfredListItem[] = languages.map((language) => ({
    title: language,
    subtitle: `Translate to ${language}`,
    arg: `${language}${LANGUAGE_DELIMITER} `,
  }));

  alfredClient.output({ items });
  return;
})();
