/** Bluetooth addresses reach us as `aa-bb-..`, `AA:BB:..` or bare hex depending on the source. */
export function normalizeAddress(value: string): string {
  return value.replace(/[^0-9a-f]/gi, '').toLowerCase();
}
