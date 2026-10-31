import type { Settings } from './settings.model';

export type SearchOptions = Settings['search'] & {
  /**
   * @description
   * The name of the file or folder to search for
   */
  name: string;
};
