export enum BluetoothFailure {
  NOT_INSTALLED = 'not-installed',
  NO_ACCESS = 'no-access',
  UNAVAILABLE = 'unavailable',
  UNKNOWN = 'unknown',
}

export class BluetoothError extends Error {
  constructor(
    readonly failure: BluetoothFailure,
    message: string,
  ) {
    super(message);
    this.name = 'BluetoothError';
  }
}
