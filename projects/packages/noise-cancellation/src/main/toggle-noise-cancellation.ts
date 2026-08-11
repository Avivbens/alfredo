import { FastAlfred } from 'fast-alfred';
import { Variables } from '../common/variables.enum';
import { DEFAULT_ALTERNATE_MODE } from '../config/constants';
import { alternateModeSchema } from '../models/alternate-mode.model';
import { toggleListeningMode } from '../services/listening-mode.service';

(async () => {
  const alfredClient = new FastAlfred();

  try {
    const alternateMode = alfredClient.env.getEnv(Variables.ALTERNATE_MODE, {
      defaultValue: DEFAULT_ALTERNATE_MODE,
      parser: (input) => alternateModeSchema.parse(input.trim().toLowerCase()),
    });

    const activeMode = await toggleListeningMode(alternateMode);
    alfredClient.log(`switched to: ${activeMode}\n`);
  } catch (error) {
    alfredClient.error(error);
  }
})();
