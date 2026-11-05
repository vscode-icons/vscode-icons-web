import type { Entry } from '../types.ts';

import { Site } from './site.ts';
import { supportedHosts } from './supported-hosts.ts';

export class GitHubGist extends Site {
  public readonly hosts = supportedHosts.githubGist;

  public collect(): Entry[] {
    return this.fromRows(
      '.file-header',
      '.file-info svg.octicon',
      '.file-info a',
      (): boolean => false,
    );
  }
}
