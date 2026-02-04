import { FastAlfred } from 'fast-alfred';
import { setTimeout } from 'node:timers/promises';
import { AvailableModelsSchema } from '@alfredo/llm';
import { registerUpdater } from '@alfredo/updater';
import { DEFAULT_DEBOUNCE_TIME } from '../common/defaults.constants';
import { Variables } from '../common/variables.enum';
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

    const llmToken = alfredClient.env.getEnv<string>(Variables.LLM_TOKEN);
    const rawModel = alfredClient.env.getEnv(Variables.SELECTED_MODEL);
    const selectedModel = rawModel ? AvailableModelsSchema.parse(rawModel) : undefined;

    if (!llmToken || !selectedModel) {
      throw new Error(
        'LLM configuration missing. Please set llm_token and selected_model in Alfred workflow variables.',
      );
    }

    const debounceTime = alfredClient.env.getEnv(Variables.DEBOUNCE_TIME, {
      defaultValue: DEFAULT_DEBOUNCE_TIME,
      parser: Number,
    });

    const titleExample = alfredClient.env.getEnv(Variables.TITLE_EXAMPLE, {
      defaultValue: undefined,
    });

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
