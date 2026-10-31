import { FastAlfred } from 'fast-alfred';
import { setTimeout } from 'node:timers/promises';
import { registerUpdater } from '@alfredo/updater';
import { SettingsSchema } from '../models/settings.model';
import { extractTicket } from '../services/ticket-extractor.service';

(async () => {
  const alfredClient = new FastAlfred();
  alfredClient.updates(registerUpdater('jira-master'));

  try {
    if (!alfredClient.input || alfredClient.input.trim().length === 0) {
      alfredClient.output({
        items: [
          {
            title: 'No input provided',
            subtitle: 'Please paste the Slack thread or issue description',
            valid: false,
          },
        ],
      });
      return;
    }

    const {
      token: llmToken,
      model: selectedModel,
      debounceTime,
      titleExample,
    } = alfredClient.env.parse(SettingsSchema);

    if (!llmToken || !selectedModel) {
      throw new Error(
        'LLM configuration missing. Please set llm_token and selected_model in Alfred workflow variables.',
      );
    }

    await setTimeout(debounceTime);

    const { tickets } = await extractTicket(llmToken, selectedModel, alfredClient.input, titleExample);

    if (!tickets.length) {
      alfredClient.output({
        items: [
          {
            title: 'No tickets found',
            subtitle: 'Could not extract ticket information. Try rephrasing or providing more details.',
            valid: false,
          },
        ],
      });
      return;
    }

    const items = tickets.map((ticket, index) => {
      const storyPointsText =
        ticket.storyPoints !== null && ticket.storyPoints !== undefined ? ` • ${ticket.storyPoints} points` : '';

      const priorityText = ticket.priority ? ` • ${ticket.priority}` : '';
      const subtitle = `${ticket.issueType}${storyPointsText}${priorityText} | Press Enter to create`;

      return {
        title: ticket.title,
        subtitle,
        arg: JSON.stringify(ticket),
        valid: true,
      };
    });

    alfredClient.output({ items });
  } catch (error) {
    alfredClient.error(error);
  }
})();
