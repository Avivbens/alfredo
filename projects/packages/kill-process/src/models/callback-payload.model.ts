export interface CallbackPayload {
  pid: number;
  name: string;
  shouldForceKill: boolean;
  cmd?: string;
}
