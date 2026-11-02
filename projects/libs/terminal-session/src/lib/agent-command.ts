import type { SessionMode } from './session-mode.schema';

export function toAgentCommand(agentCommand: string, resumeArgs: string, mode: SessionMode): string {
  return mode === 'resume' ? `${agentCommand} ${resumeArgs}` : agentCommand;
}
