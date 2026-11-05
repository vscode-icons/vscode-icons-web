import type { Entry } from '../types.ts';

import { Site } from './site.ts';
import { supportedHosts } from './supported-hosts.ts';

export class GitHub extends Site {
  private static readonly repositoryFileNamePatterns: Array<[RegExp, string]> =
    [
      [/^readme(?:\.md)?$/i, 'readme.md'],
      [/^code of conduct(?:\s+policy)?$/i, 'code_of_conduct.md'],
      [/^contributing(?:\s+guidelines?)?$/i, 'contributing.md'],
      [/^security(?:\s+policy)?$/i, 'security.md'],
      [/\blicense\b/i, 'license'],
    ];

  public readonly hosts = supportedHosts.github;

  constructor() {
    super();
    if (typeof location !== 'undefined' && this.matches(location.hostname)) {
      document.documentElement.setAttribute('data-vscode-icons-github', '');
    }
  }

  public collect(): Entry[] {
    return [
      ...this.fromRows(
        'tr#folder-row-0',
        'a[data-testid="up-tree"] svg',
        'a[data-testid="up-tree"]',
        (): boolean => true,
      ),
      // Current React UI: file table and file tree
      ...this.fromRows(
        'tr.react-directory-row .react-directory-filename-column',
        'svg',
        'a',
        (_row: Element, icon: Element): boolean =>
          icon.classList.contains('icon-directory'),
      ).filter((entry): boolean => entry.icon.getClientRects().length > 0),
      ...this.fromRows(
        'li[role="treeitem"]',
        ':scope > div svg:not([class*="chevron"])',
        ':scope > div [class*="TreeView"][class*="ItemContent"] span:last-child',
        (row: Element): boolean => row.hasAttribute('aria-expanded'),
      ),
      ...this.fromRows(
        'nav[aria-label="Repository files"] a',
        'svg.octicon',
        '[data-component="text"]',
        (): boolean => false,
      )
        .filter(
          (entry: Entry): boolean =>
            entry.icon.getClientRects().length > 0 &&
            this.getRepositoryFileName(entry.name) !== undefined,
        )
        .map((entry: Entry): Entry => ({
          ...entry,
          name: this.getRepositoryFileName(entry.name)!,
        })),
      ...this.fromRows(
        '#file-results-list a[role="option"], #tree-browser a.tree-browser-result[role="option"]',
        'svg.octicon-file, svg.octicon-file-directory-fill',
        '[class*="HighlightMatch"], marked-text',
        (_row: Element, icon: Element): boolean =>
          icon.classList.contains('octicon-file-directory-fill'),
      ).map((entry: Entry): Entry => ({
        ...entry,
        name: entry.name
          .slice(entry.name.lastIndexOf('/') + 1)
          .replaceAll('\u200b', ''),
      })),
      // Legacy UI
      ...this.fromRows(
        '.js-navigation-item',
        'svg.octicon-file, svg.octicon-file-directory-fill, svg.octicon-file-directory',
        '.js-navigation-open',
        (_row: Element, icon: Element): boolean =>
          icon.classList.contains('octicon-file-directory-fill'),
      ),
    ];
  }

  private getRepositoryFileName(label: string): string | undefined {
    return GitHub.repositoryFileNamePatterns.find(
      ([pattern]: [RegExp, string]): boolean => pattern.test(label),
    )?.[1];
  }
}
