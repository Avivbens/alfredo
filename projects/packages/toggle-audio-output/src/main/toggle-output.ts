import { FastAlfred } from 'fast-alfred';
import { Variables } from '../common/variables.enum';
import { DEFAULT_OUTPUTS_LIST } from '../config/constants';
import { getConnectedAudioOutputs, getCurrentAudioOutput, setAudioOutput } from '../services/audio-connection.service';

(async () => {
  const alfredClient = new FastAlfred();

  const outputList: string[] = alfredClient.env.getEnv(Variables.OUTPUTS_LIST, {
    defaultValue: DEFAULT_OUTPUTS_LIST,
    parser: (input) => input.split('\n').map((item) => item.trim()),
  });

  const outputListMap = new Set(outputList);

  try {
    const [connectedOutputs, currentOutput] = await Promise.all([
      /*  */
      getConnectedAudioOutputs(),
      getCurrentAudioOutput(),
    ]);

    if (!connectedOutputs.length || !currentOutput) {
      alfredClient.error(new Error('No audio outputs found'));
      return;
    }

    /**
     * Filter connected outputs to only include those in the output list
     */
    const toggleList = connectedOutputs.filter((output) => outputListMap.has(output));
    const uniqueToggleList = Array.from(new Set(toggleList));
    alfredClient.log(`uniqueToggleList: ${uniqueToggleList}\n`);

    const currentOutputIndex = uniqueToggleList.indexOf(currentOutput);
    alfredClient.log(`currentOutputIndex: ${currentOutputIndex}\n`);

    /**
     * Find the next output in the list
     */
    const nextOutput = uniqueToggleList.at(currentOutputIndex + 1) || uniqueToggleList.at(0);
    alfredClient.log(`nextOutput: ${nextOutput}\n`);

    if (!nextOutput) {
      alfredClient.error(new Error('No valid audio output found to toggle'));
      return;
    }

    await setAudioOutput(nextOutput);
  } catch (error) {
    alfredClient.error(error);
  }
})();
