import type { Entry } from '../types.ts';

import { Site } from './site.ts';
import { supportedHosts } from './supported-hosts.ts';

export class Codeberg extends Site {
  public readonly hosts = supportedHosts.codeberg;

  public collect(): Entry[] {
    return [
      ...this.fromRows(
        '#repo-files-table tr.ready',
        'td.name svg.octicon-file, td.name svg.octicon-file-directory, td.name svg.octicon-file-directory-fill',
        'td.name a',
        (_row: Element, icon: Element): boolean =>
          icon.classList.contains('octicon-file-directory') ||
          icon.classList.contains('octicon-file-directory-fill'),
      ),
      ...this.fromRows(
        '#readme .file-header-left',
        'svg.octicon-book',
        'strong a',
        (): boolean => false,
      ),
      ...this.fromRows(
        '#repo-find-file-table tr',
        'td a svg.octicon-file',
        'td a',
        (): boolean => false,
      ).map((entry: Entry): Entry => ({
        ...entry,
        name: entry.name.slice(entry.name.lastIndexOf('/') + 1),
      })),
      ...this.fromRows(
        '#diff-file-tree .item-directory, #diff-file-tree .item-file',
        'svg.octicon-file, svg.octicon-file-directory, svg.octicon-file-directory-fill',
        '.gt-ellipsis',
        (_row: Element, icon: Element): boolean =>
          icon.classList.contains('octicon-file-directory') ||
          icon.classList.contains('octicon-file-directory-fill'),
      ),
    ];
  }
}
