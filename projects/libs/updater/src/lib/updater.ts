import { ClientUpdatesConfig, gitHubMonoRepoFetcher } from 'fast-alfred';

const CHECK_EVERY_DAY = 60 * 24; // 24 hours
const SNOOZE_TIME_2_DAYS = 60 * 24 * 2; // 48 hours

export function registerUpdater(workflowName: string): ClientUpdatesConfig {
  const matcher = new RegExp(`release/${workflowName}/(.*)`);

  return {
    fetcher: gitHubMonoRepoFetcher({
      owner: 'avivbens',
      repo: 'alfredo',
      releasePattern: matcher,
      autoInstall: true,
    }),
    checkInterval: CHECK_EVERY_DAY,
    snoozeTime: SNOOZE_TIME_2_DAYS,
  };
}
