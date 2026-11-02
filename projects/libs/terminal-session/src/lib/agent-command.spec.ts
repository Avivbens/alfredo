import { describe, expect, it } from 'vitest';
import { toAgentCommand } from './agent-command';

describe('agent-command', () => {
  describe('toAgentCommand', () => {
    it('should run the agent command alone for a new session', () => {
      expect(toAgentCommand('claude', '--continue', 'new')).toBe('claude');
    });

    it('should append the resume args to resume the last session', () => {
      expect(toAgentCommand('claude', '--continue', 'resume')).toBe('claude --continue');
    });
  });
});
