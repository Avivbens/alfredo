export interface SearchOptions {
  /**
   * @description
   * The name of the file or folder to search for
   */
  name: string;

  /**
   * @description
   * The type of the search
   */
  type: 'file' | 'folder' | 'all';

  /**
   * @description
   * The paths to search in
   */
  onlyIn?: string[];

  /**
   * @description
   * The paths to force include in the search results
   */
  forceInclude?: string[];

  /**
   * @description
   * The paths to exclude from the search
   */
  excludePaths?: (string | RegExp)[];

  /**
   * @description
   * Whether to search only in git repositories
   */
  gitReposOnly?: boolean;

  /**
   * @description
   * Whether to exclude node_modules from the search
   */
  excludeNodeModules?: boolean;

  /**
   * @description
   * Whether to exclude hidden files and folders from the searchÏ
   */
  excludeHidden?: boolean;

  /**
   * @description
   * Whether to exclude git repositories from the search
   */
  excludeGit?: boolean;
}
