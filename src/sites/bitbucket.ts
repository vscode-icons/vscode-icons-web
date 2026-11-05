import type { Entry } from '../types.ts';

import * as constants from '../constants.ts';
import { Site } from './site.ts';
import { supportedHosts } from './supported-hosts.ts';

export class Bitbucket extends Site {
  public readonly hosts = supportedHosts.bitbucket;

  constructor() {
    super();
    if (typeof location !== 'undefined' && this.matches(location.hostname)) {
      document.documentElement.setAttribute(
        constants.BITBUCKET_SCOPE_ATTRIBUTE,
        '',
      );
    }
  }

  public collect(): Entry[] {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const folderPath = pathSegments[2] === 'src' ? pathSegments.slice(4) : [];
    const folderName = folderPath.at(-1);
    const entries = this.fromRows(
      'table[data-qa="repository-directory"] tbody tr, table:not([data-qa="repository-directory"]) tbody tr:has(a[aria-label^="File, "][href*="/src/"])',
      'td:first-child svg, td:first-child [role="img"]',
      'td:first-child a',
      (row: Element): boolean => {
        const href = row.querySelector('a')?.getAttribute('href') ?? '';
        const path = href.split(/[?#]/, 1)[0] ?? '';
        return path === constants.PARENT_DIRECTORY_PATH || path.endsWith('/');
      },
    )
      .filter(
        (entry: Entry): boolean =>
          entry.name !== constants.PARENT_DIRECTORY_PATH,
      )
      .map((entry: Entry): Entry => ({
        ...entry,
        name: entry.name.slice(entry.name.lastIndexOf('/') + 1),
      }));

    if (pathSegments[2] === 'commits') {
      entries.push(
        ...this.fromRows(
          '[data-qa="bk-file__header"]:has([data-qa="bk-filepath"])',
          '[data-qa="bk-filepath"]',
          '[data-qa="bk-filepath"]',
          (): boolean => false,
        ).map((entry: Entry): Entry => ({
          ...entry,
          name: entry.name.slice(entry.name.lastIndexOf('/') + 1),
        })),
      );
    }

    const rootIcon = document.querySelector(
      '[role="img"][aria-label="Directory"] svg',
    );
    const fileIcon =
      pathSegments[2] === 'src'
        ? document.querySelector(
            '[data-qa="bk-file__header"] > div:first-child svg',
          )
        : null;
    const pathName = pathSegments.at(-1);
    if (fileIcon && pathName) {
      entries.unshift({
        icon: fileIcon,
        name: decodeURIComponent(pathName),
        isFolder: false,
        isOpen: false,
      });
    } else if (rootIcon) {
      entries.unshift({
        icon: rootIcon,
        name: folderName
          ? decodeURIComponent(folderName)
          : constants.ROOT_FOLDER_NAME,
        isFolder: true,
        isOpen: false,
      });
    }

    return entries;
  }
}
