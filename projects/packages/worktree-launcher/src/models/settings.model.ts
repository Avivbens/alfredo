import { alfredSchemas } from 'fast-alfred/schemas';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { z } from 'zod';
import { terminalSchema } from '@alfredo/terminal-session';

export const settingsSchema = z.object({
  prs_keyword: z.string().default('wt'),
  new_task_keyword: z.string().default('wtn'),
  repo_roots: alfredSchemas.paths().default([join(homedir(), 'dev')]),
  scan_depth: alfredSchemas.number().default(3),
  editor_app: z.enum(['vscode', 'cursor']).default('vscode'),
  terminal_app: terminalSchema.default('native'),
  agent_command: z.string().default('claude'),
  agent_resume_args: z.string().default('--continue'),
  install_after_create: alfredSchemas.checkbox().default(true),
  slice_amount: alfredSchemas.number().default(20),
});
export type Settings = z.infer<typeof settingsSchema>;
