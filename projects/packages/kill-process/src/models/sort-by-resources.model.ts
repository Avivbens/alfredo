export const SORT_BY_RESOURCE_OPTIONS = ['cpu', 'memory', 'none'] as const;
export type SortByResource = (typeof SORT_BY_RESOURCE_OPTIONS)[number];

const DEFAULT_SORT_BY_RESOURCE: SortByResource = 'none';

export const getSortByResource = (input: string): SortByResource => {
  const value = input.toLowerCase();
  return SORT_BY_RESOURCE_OPTIONS.includes(value as SortByResource)
    ? (value as SortByResource)
    : DEFAULT_SORT_BY_RESOURCE;
};
