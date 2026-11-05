import type { Entry } from '../types.ts';

import { Site } from './site.ts';
import { supportedHosts } from './supported-hosts.ts';

export class SourceForge extends Site {
  public readonly hosts = supportedHosts.sourceforge;

  public collect(): Entry[] {
    return [
      ...Array.from(
        document.querySelectorAll(
          'h2.title > span > a > b.fa-folder-open-o[title="Root directory"]',
        ),
        (icon: Element): Entry => ({
          icon,
          name: 'Root directory',
          isFolder: true,
          isOpen: true,
        }),
      ),
      ...this.fromRows(
        '#files_list tbody tr.file, #files_list tbody tr.folder',
        'th a svg, th a .icon, th a i',
        'th a .name',
        (row: Element): boolean => row.classList.contains('folder'),
      ),
      ...this.fromRows(
        '#content_base table > tbody > tr:has(> td:first-child > a.icon > i.fa)',
        'td:first-child > a.icon > i.fa',
        'td:first-child > a.icon',
        (_row: Element, icon: Element): boolean =>
          icon.classList.contains('fa-folder') ||
          icon.classList.contains('fa-folder-o'),
      ),
    ];
  }
}
