import { z } from 'zod';

export const BluetoothDeviceSchema = z.object({
  address: z.string(),
  name: z.string(),
  connected: z.boolean(),
  paired: z.boolean(),
});

export const BluetoothDeviceListSchema = z.array(BluetoothDeviceSchema);

export type BluetoothDevice = z.infer<typeof BluetoothDeviceSchema>;
