import { setTimeout as delay } from 'node:timers/promises';
import { $ } from 'zurk';
import { normalizeAddress } from '../common/address.util';
import { AUDIO_ROUTE_ATTEMPTS, AUDIO_ROUTE_RETRY_DELAY_MS } from '../config/constants';
import { AudioSource, AudioSourceSchema } from '../models/audio-source-all.model';

export async function getConnectedAudioDevices(): Promise<AudioSource[]> {
  const { stdout } = await $`SwitchAudioSource -a -f json`;

  const audioData = stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => AudioSourceSchema.parse(JSON.parse(line)));

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

/** Names can collide between devices, the uid cannot. */
export async function setAudioOutputByUid(uid: string): Promise<void> {
  if (!uid) {
    throw new Error('Output uid cannot be empty');
  }

  await $`SwitchAudioSource -u ${uid}`;
}

/**
 * CoreAudio prefixes a Bluetooth device's uid with its MAC (`aa-bb-..:output`),
 * which pairs the two sides together far more reliably than the display name.
 */
export function isOutputFor(address: string, { type, uid }: AudioSource): boolean {
  return type === 'output' && normalizeAddress(uid.split(':')[0] ?? '') === normalizeAddress(address);
}

/**
 * Routes system audio to a just-connected Bluetooth device, polling because
 * CoreAudio registers the device a beat after the Bluetooth link comes up.
 * Resolves to the routed device name, or undefined when the device never
 * exposes an audio output.
 */
export async function routeAudioTo(address: string): Promise<string | undefined> {
  for (let attempt = 1; attempt <= AUDIO_ROUTE_ATTEMPTS; attempt++) {
    const output = (await getConnectedAudioDevices()).find((device) => isOutputFor(address, device));

    if (output) {
      await setAudioOutput(output.name);
      return output.name;
    }

    if (attempt < AUDIO_ROUTE_ATTEMPTS) {
      await delay(AUDIO_ROUTE_RETRY_DELAY_MS);
    }
  }

  return undefined;
}
