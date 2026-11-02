import { FastAlfred } from 'fast-alfred';
import { env, stdout } from 'node:process';
import { $ } from 'zurk';
import { escapeAppleScriptString, runAppleScript } from '@alfredo/run-applescript';
import { toEventUrl, toPrivacySettingsUrl } from '../common/calendar-links.util';
import { toFailureMessage } from '../common/failure-message.util';
import { agendaActionSchema } from '../models/eventkit.schema';
import { requestCalendarAccess } from '../services/eventkit.service';

const DEFAULT_AGENDA_KEYWORD = 'today';

(async () => {
  const alfredClient = new FastAlfred();

  try {
    const action = agendaActionSchema.parse(JSON.parse(alfredClient.input ?? ''));

    switch (action.kind) {
      case 'open-event': {
        await $`open ${toEventUrl(action.id)}`;
        break;
      }
      case 'show-list': {
        /** Reveal the list, never the reminder: `show <reminder>` blocks for ~35s. */
        await runAppleScript(`tell application "Reminders"
  try
    show list "${escapeAppleScriptString(action.list)}"
  end try
  activate
end tell`);
        break;
      }
      case 'request-access': {
        await requestCalendarAccess(action.entity);

        const keyword = env.ai_agenda_keyword || DEFAULT_AGENDA_KEYWORD;
        await runAppleScript(
          `tell application id "com.runningwithcrayons.Alfred" to search "${escapeAppleScriptString(keyword)} "`,
        );
        break;
      }
      case 'open-settings': {
        await $`open ${toPrivacySettingsUrl(action.entity)}`;
        break;
      }
    }
  } catch (error) {
    /** Stdout feeds the Post Notification, so it gets only the readable cause while the debugger gets everything. */
    alfredClient.log(error instanceof Error ? (error.stack ?? error.message) : String(error));
    stdout.write(toFailureMessage(error));
  }
})();
