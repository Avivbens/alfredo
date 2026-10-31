import type { AlfredListItem } from 'fast-alfred';
import { FastAlfred } from 'fast-alfred';
import { setTimeout } from 'node:timers/promises';
import { getActiveApp } from '@alfredo/active-app';
import { callModel } from '@alfredo/llm';
import { registerUpdater } from '@alfredo/updater';
import { TONE_SYSTEM_PROMPT } from '../common/prompts/tone.prompt';
import { SettingsSchema } from '../models/settings.model';
import { AvailableTone, AvailableToneSchema } from '../models/tones.enum';

(async () => {
  const alfredClient = new FastAlfred();
  alfredClient.updates(registerUpdater('text-transformer'));

  try {
    const { token, model, debounceTime, useApplicationContext } = alfredClient.env.parse(SettingsSchema);

    if (!token || !model) {
      throw new Error('Token or model is not defined!');
    }

    if (!alfredClient.input) {
      throw new Error('Input is required');
    }

    const [tone, ...rest] = alfredClient.input.split(' ');
    const query = rest.join(' ').trim();

    if (!query) {
      return;
    }

    const parsedTone = AvailableToneSchema.safeParse(tone);
    if (!parsedTone.success) {
      throw new Error(`Not allowed tone! Please use one of: ${Object.values(AvailableTone).join(', ')}`);
    }

    const applicationContext = useApplicationContext && (await getActiveApp());
    alfredClient.log(JSON.stringify({ useApplicationContext, applicationContext }, null, 2));

    /**
     * Debounce time to wait for the user to finish typing
     */
    await setTimeout(debounceTime);

    const system = await TONE_SYSTEM_PROMPT(parsedTone.data, useApplicationContext).format({
      applicationContext,
    });

    const res = await callModel(token, model, { system, user: query });

    const items: AlfredListItem[] = [
      {
        title: res,
        subtitle: 'Tones',
        arg: res,
        mods: {
          cmd: {
            subtitle: 'Preview',
            arg: res,
          },
        },
      },
    ];

    alfredClient.output({ items });
  } catch (error) {
    alfredClient.error(error);
  }
})();
