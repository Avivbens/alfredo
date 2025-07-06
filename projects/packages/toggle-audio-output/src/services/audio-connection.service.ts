import { $ } from 'zurk';
import { AudioSource } from '../models/audio-source-all.model';

export async function getConnectedAudioDevices(): Promise<AudioSource[]> {
  const { stdout } = await $`SwitchAudioSource -a -f json`;

  const audioData = stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line)) as AudioSource[];

  return audioData || [];
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
