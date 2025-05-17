import { SearchOptions } from '../models/search-options.model';

export const FILE_TYPE_TO_QUERY_STRING: Record<SearchOptions['type'], string> = {
  folder: 'kMDItemContentType == "public.folder"',
  file: 'kMDItemContentType != "public.folder"',
  all: '',
};
