import type { Entry } from '../types.ts';

import {
  GITLAB_BIDI_MARKS_PATTERN,
  GITLAB_SCOPE_ATTRIBUTE,
} from '../constants.ts';
import { Site } from './site.ts';
import { supportedHosts } from './supported-hosts.ts';

export class GitLab extends Site {
  public readonly hosts = supportedHosts.gitlab;

  constructor() {
    super();
    if (typeof location !== 'undefined' && this.matches(location.hostname)) {
      document.documentElement.setAttribute(GITLAB_SCOPE_ATTRIBUTE, '');
    }
  }

  public collect(): Entry[] {
    const entries = this.fromRows(
      '.tree-item, [data-testid="file-tree-row"], li[role="treeitem"]',
      'svg[data-testid="folder-icon"], svg[data-testid="file-icon"], svg.file-icon, svg.folder-icon, [data-testid="file-row"] svg',
      '.tree-item-link, [data-testid="file-row"], a',
      (_: Element, icon: Element): boolean =>
        icon.getAttribute('data-testid') === 'folder-icon' ||
        icon.classList.contains('folder-icon'),
    ).map((entry): Entry => {
      const name = entry.icon
        .closest('li[role="treeitem"]')
        ?.getAttribute('aria-label')
        ?.trim();
      return {
        ...entry,
        name: this.normalizeName(name ?? entry.name),
      };
    });
    entries.push(
      ...[
        ...this.fromRows(
          '.tree-content-holder .tree-table tr.tree-item',
          'td.tree-item-file-name a svg',
          'td.tree-item-file-name a .str-truncated',
          (): boolean => false,
        ),
        ...this.fromRows(
          '.file-tree-search-result-item',
          'svg',
          'span.gl-block',
          (): boolean => false,
        ),
        ...this.fromRows(
          '.js-blob-result .js-file-title',
          ':scope > a',
          ':scope > a',
          (): boolean => false,
        ),
        ...this.fromRows(
          'div.gl-flex.gl-items-center.gl-leading-1:has([data-testid="file-name-content"])',
          'svg:has(use[href*="/file_icons/"])',
          '[data-testid="file-name-content"]',
          (): boolean => false,
        ),
      ].map((entry): Entry => ({
        ...entry,
        name: this.normalizeName(entry.name).replace(/^.*\//, ''),
      })),
    );
    for (const row of document.querySelectorAll(
      '.diff-file-row [data-testid="file-row"]',
    )) {
      const icon = row.querySelector(
        'svg.folder-icon, svg:has(use[href*="/file_icons/"])',
      );
      const name = this.normalizeName(
        row
          .querySelector('[data-qa-file-name]')
          ?.getAttribute('data-qa-file-name'),
      ).replace(/^.*\//, '');
      if (icon && name) {
        const isFolder = icon.classList.contains('folder-icon');
        entries.push({
          icon,
          name,
          isFolder,
          isOpen: isFolder && row.getAttribute('aria-expanded') === 'true',
        });
      }
    }
    for (const heading of document.querySelectorAll(
      'h1[data-testid="repository-heading"]',
    )) {
      const icon = heading.querySelector(
        'svg.folder-icon, svg:has(use[href*="/file_icons/"])',
      );
      const name = this.normalizeName(heading.textContent);
      if (icon && name) {
        const isFolder = icon.classList.contains('folder-icon');
        entries.push({ icon, name, isFolder, isOpen: isFolder });
      }
    }
    entries.push(
      ...this.fromRows(
        '.file-header-content',
        'svg:has(use[href*="/file_icons/"])',
        '[data-testid="file-title-content"]',
        (): boolean => false,
      ).map((entry): Entry => ({
        ...entry,
        name: this.normalizeName(entry.name),
      })),
    );
    return entries;
  }

  private normalizeName(name: string | null | undefined): string {
    if (!name) {
      return '';
    }
    return name.replace(GITLAB_BIDI_MARKS_PATTERN, '').trim();
  }
}
