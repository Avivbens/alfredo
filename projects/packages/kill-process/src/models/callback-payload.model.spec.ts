import { describe, expect, it } from 'vitest';
import { callbackPayloadSchema } from './callback-payload.model';

describe('callback-payload.model', () => {
  describe('callbackPayloadSchema', () => {
    it('should read the payload a process row hands to the kill action', () => {
      expect(
        callbackPayloadSchema.parse({
          pid: 4242,
          name: 'Slack',
          shouldForceKill: true,
          cmd: '/Applications/Slack.app',
        }),
      ).toEqual({ pid: 4242, name: 'Slack', shouldForceKill: true, cmd: '/Applications/Slack.app' });
    });

    it('should reject 0 and negative ids, since those signal whole process groups', () => {
      expect(() => callbackPayloadSchema.parse({ pid: 0, name: 'x', shouldForceKill: true })).toThrow();
      expect(() => callbackPayloadSchema.parse({ pid: -1, name: 'x', shouldForceKill: true })).toThrow();
    });

    it('should reject an id that is not a whole number', () => {
      expect(() => callbackPayloadSchema.parse({ pid: '4242; id', name: 'x', shouldForceKill: false })).toThrow();
      expect(() => callbackPayloadSchema.parse({ pid: 42.5, name: 'x', shouldForceKill: false })).toThrow();
    });
  });
});
