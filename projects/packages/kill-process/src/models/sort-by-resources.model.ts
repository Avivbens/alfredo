import { z } from 'zod';

export const SortByResourceSchema = z.enum(['cpu', 'memory', 'none']);
export type SortByResource = z.infer<typeof SortByResourceSchema>;

const DEFAULT_SORT_BY_RESOURCE: SortByResource = 'none';

export const getSortByResource = (input: string): SortByResource => {
  const result = SortByResourceSchema.safeParse(input.toLowerCase());
  return result.success ? result.data : DEFAULT_SORT_BY_RESOURCE;
};
