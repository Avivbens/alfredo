import { z } from 'zod';
import type { ProjectGraph } from '@nx/devkit';

export function createNxTaskEnvSchema(graph: ProjectGraph) {
  return z.object({
    NX_TASK_TARGET_PROJECT: z
      .string({ required_error: 'NX_TASK_TARGET_PROJECT is not set - run this suite through `nx test`' })
      .refine(
        (project) => project in graph.nodes,
        (project) => ({ message: `NX_TASK_TARGET_PROJECT "${project}" is not a project in the Nx graph` }),
      ),
  });
}
