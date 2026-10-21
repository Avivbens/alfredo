import { z } from 'zod';
import { AudioSourceSchema } from './audio-source-all.model';
import { PairedDeviceSchema } from './bluetooth-device.model';

export const CoreAudioEntrySchema = AudioSourceSchema.pick({ name: true, uid: true }).extend({
  kind: z.literal('core-audio'),
  current: z.boolean(),
  bluetooth: PairedDeviceSchema.optional(),
});

export const AirPlayEntrySchema = z.object({
  kind: z.literal('airplay'),
  name: z.string(),
});

export const BluetoothEntrySchema = PairedDeviceSchema.extend({
  kind: z.literal('bluetooth'),
});

export const OutputEntrySchema = z.discriminatedUnion('kind', [
  CoreAudioEntrySchema,
  AirPlayEntrySchema,
  BluetoothEntrySchema,
]);

export type CoreAudioEntry = z.infer<typeof CoreAudioEntrySchema>;
export type AirPlayEntry = z.infer<typeof AirPlayEntrySchema>;
export type BluetoothEntry = z.infer<typeof BluetoothEntrySchema>;
export type OutputEntry = z.infer<typeof OutputEntrySchema>;
