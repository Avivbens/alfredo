import { FastAlfred } from 'fast-alfred';
import { registerUpdater } from '@alfredo/updater';
import { SettingsSchema } from '../models/settings.model';
import { toAgendaItems } from '../services/agenda-items.service';
import { loadAgenda } from '../services/agenda-loader.service';

(async () => {
  const alfredClient = new FastAlfred();
  alfredClient.updates(registerUpdater('ai-calendar-assistant'));

  try {
    const { agendaCalendars, agendaShowReminders } = alfredClient.env.parse(SettingsSchema);
    const load = await loadAgenda({ calendars: agendaCalendars, showReminders: agendaShowReminders });

    alfredClient.output({ items: toAgendaItems(load, new Date()) });
  } catch (error) {
    alfredClient.error(error);
  }
})();
