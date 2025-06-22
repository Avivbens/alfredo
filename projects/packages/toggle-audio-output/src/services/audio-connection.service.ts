import { $ } from 'zurk';
import { SystemProfilerOutput } from '../models/system-profiler-output.model';

export async function getConnectedAudioOutputs(): Promise<string[]> {
  const { stdout } = await $`system_profiler SPAudioDataType -json`;

  const audioData = JSON.parse(stdout) as SystemProfilerOutput;
  const connectedOutputs: string[] | undefined = audioData.SPAudioDataType.at(0)?._items.map(({ _name }) => _name);

  return connectedOutputs || [];
}

export async function getCurrentAudioOutput(): Promise<string | undefined> {
  const { stdout } = await $`SwitchAudioSource -c`;

  return stdout.trim() || undefined;
}

export async function setAudioOutput(output: string): Promise<void> {
  if (!output) {
    throw new Error('Output name cannot be empty');
  }

  await $`SwitchAudioSource -s ${output}`;
}
