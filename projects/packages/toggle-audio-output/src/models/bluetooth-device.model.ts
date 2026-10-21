import { z } from 'zod';

export const BluetoothDeviceSchema = z.object({
  address: z.string(),
  name: z.string(),
  connected: z.boolean(),
  paired: z.boolean(),
});

export const BluetoothDeviceListSchema = z.array(BluetoothDeviceSchema);

export type BluetoothDevice = z.infer<typeof BluetoothDeviceSchema>;

export const PairedDeviceSchema = BluetoothDeviceSchema.extend({ isAudio: z.boolean() });

export type PairedDevice = z.infer<typeof PairedDeviceSchema>;

const ProfilerDeviceListSchema = z.array(
  z.record(z.string(), z.object({ device_address: z.string(), device_minorType: z.string().optional() })),
);

/** `system_profiler SPBluetoothDataType -json` - each device is a one-key record of its display name. */
export const BluetoothProfilerSchema = z.object({
  SPBluetoothDataType: z.array(
    z.object({
      device_connected: ProfilerDeviceListSchema.optional(),
      device_not_connected: ProfilerDeviceListSchema.optional(),
    }),
  ),
});
