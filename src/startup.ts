import * as constants from './constants.ts';

export function getApplyDelayMs(isGitHubHost: boolean): number {
  return isGitHubHost
    ? constants.GITHUB_APPLY_DELAY_MS
    : constants.APPLY_DELAY_MS;
}

export function scheduleInitialApply(
  isGitHubHost: boolean,
  delayMs: number,
  apply: () => void,
): NodeJS.Timeout | undefined {
  if (isGitHubHost) {
    return setTimeout(apply, delayMs);
  }
  apply();
  return undefined;
}
