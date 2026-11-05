import type { Entry } from '../../src/types.ts';

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { getFolderIcon } from '@vscode-icons/vscode-icons-api';

import { Bitbucket } from '../../src/sites/bitbucket.ts';

void describe('Bitbucket', (): void => {
  void it('collects commit diff filenames without replacing the expand control', (): void => {
    const headings = [
      { textContent: 'platform/eslint-plugin/src/rules/constants.tsx' },
      { textContent: 'platform/src/.../__tests__/test.tsx' },
    ];
    const originalDocument = Object.getOwnPropertyDescriptor(
      globalThis,
      'document',
    );
    const originalLocation = Object.getOwnPropertyDescriptor(
      globalThis,
      'location',
    );
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: {
        documentElement: { setAttribute: (): void => undefined },
        querySelectorAll: (selector: string): unknown[] =>
          selector.startsWith('[data-qa="bk-file__header"]')
            ? headings.map(heading => ({
                querySelector: (): typeof heading => heading,
                getAttribute: (): null => null,
              }))
            : [],
        querySelector: (selector: string): null => {
          assert.notEqual(
            selector,
            '[data-qa="bk-file__header"] > div:first-child svg',
          );
          return null;
        },
      },
    });
    Object.defineProperty(globalThis, 'location', {
      configurable: true,
      value: {
        hostname: 'bitbucket.org',
        pathname: '/atlassian/repository/commits/02d8506',
      },
    });

    try {
      assert.deepEqual(new Bitbucket().collect(), [
        {
          icon: headings[0],
          name: 'constants.tsx',
          isFolder: false,
          isOpen: false,
        },
        { icon: headings[1], name: 'test.tsx', isFolder: false, isOpen: false },
      ]);
    } finally {
      if (originalDocument) {
        Object.defineProperty(globalThis, 'document', originalDocument);
      } else {
        Reflect.deleteProperty(globalThis, 'document');
      }
      if (originalLocation) {
        Object.defineProperty(globalThis, 'location', originalLocation);
      } else {
        Reflect.deleteProperty(globalThis, 'location');
      }
    }
  });

  void it('collects filtered file results by basename', (): void => {
    const icon = {};
    const link = {
      textContent: 'docs/README.md',
      getAttribute: (): string =>
        '/workspace/repository/src/main/docs/README.md',
    };
    const row = {
      querySelector: (selector: string): unknown =>
        selector.includes('svg') ? icon : link,
      getAttribute: (): null => null,
    };
    const originalDocument = Object.getOwnPropertyDescriptor(
      globalThis,
      'document',
    );
    const originalLocation = Object.getOwnPropertyDescriptor(
      globalThis,
      'location',
    );
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: {
        documentElement: { setAttribute: (): void => undefined },
        querySelectorAll: (selector: string): Array<typeof row> => {
          assert.match(
            selector,
            /table:not\(\[data-qa="repository-directory"\]\) tbody tr:has\(a\[aria-label\^="File, "\]\[href\*="\/src\/"\]\)/,
          );
          return [row];
        },
        querySelector: (): null => null,
      },
    });
    Object.defineProperty(globalThis, 'location', {
      configurable: true,
      value: {
        hostname: 'bitbucket.org',
        pathname: '/workspace/repository/src/main/',
      },
    });

    try {
      assert.deepEqual(new Bitbucket().collect(), [
        { icon, name: 'README.md', isFolder: false, isOpen: false },
      ]);
    } finally {
      if (originalDocument) {
        Object.defineProperty(globalThis, 'document', originalDocument);
      } else {
        Reflect.deleteProperty(globalThis, 'document');
      }
      if (originalLocation) {
        Object.defineProperty(globalThis, 'location', originalLocation);
      } else {
        Reflect.deleteProperty(globalThis, 'location');
      }
    }
  });

  void it('distinguishes parent, folder, and file links', (): void => {
    const rootIcon = {} as Element;
    const fileIcon = {} as Element;
    const documentAttributes = new Map<string, string>();
    const makeRow = (name: string, href: string): Element => {
      const icon = {
        classList: { contains: (): boolean => false },
      };
      const link = {
        textContent: name,
        getAttribute: (attribute: string): string | null =>
          attribute === 'href' ? href : null,
      };
      return {
        querySelector: (selector: string): unknown =>
          selector.includes('svg') || selector.includes('role="img"')
            ? icon
            : link,
        getAttribute: (): null => null,
      } as unknown as Element;
    };
    const rows = [
      makeRow('..', '..'),
      makeRow('designs', 'designs/?at=refs%2Fheads%2Fmaster'),
      makeRow('README.md', 'README.md?at=refs%2Fheads%2Fmaster'),
    ];
    const mockLocation = {
      hostname: 'bitbucket.org',
      pathname: '/EVEMonDevTeam/evemon/src/master/src/',
    };
    const originalDocument = Object.getOwnPropertyDescriptor(
      globalThis,
      'document',
    );
    const originalLocation = Object.getOwnPropertyDescriptor(
      globalThis,
      'location',
    );
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: {
        documentElement: {
          setAttribute: (name: string, value: string): void => {
            documentAttributes.set(name, value);
          },
        },
        querySelectorAll: (): typeof rows => rows,
        querySelector: (selector: string): Element | null => {
          if (
            selector === '[data-qa="bk-file__header"] > div:first-child svg' &&
            mockLocation.pathname.endsWith('/README.md')
          ) {
            return fileIcon;
          }
          return selector === '[role="img"][aria-label="Directory"] svg'
            ? rootIcon
            : null;
        },
      },
    });
    Object.defineProperty(globalThis, 'location', {
      configurable: true,
      value: mockLocation,
    });

    try {
      const entries = new Bitbucket().collect();
      assert.equal(documentAttributes.get('data-vscode-icons-bitbucket'), '');
      assert.equal(entries[0]?.icon, rootIcon);
      assert.deepEqual(
        entries.map((entry: Entry) => ({
          name: entry.name,
          isFolder: entry.isFolder,
        })),
        [
          { name: 'src', isFolder: true },
          { name: 'designs', isFolder: true },
          { name: 'README.md', isFolder: false },
        ],
      );

      mockLocation.pathname = '/EVEMonDevTeam/evemon/src/master/';
      const rootEntry = new Bitbucket().collect()[0];
      assert.ok(rootEntry);
      assert.equal(rootEntry.name, 'root');
      assert.equal(getFolderIcon(rootEntry.name), 'default_root_folder.svg');

      mockLocation.pathname = '/EVEMonDevTeam/evemon/src/master/src/README.md';
      const fileEntry = new Bitbucket().collect()[0];
      assert.equal(fileEntry?.icon, fileIcon);
      assert.equal(fileEntry?.name, 'README.md');
      assert.equal(fileEntry?.isFolder, false);
    } finally {
      if (originalDocument) {
        Object.defineProperty(globalThis, 'document', originalDocument);
      } else {
        Reflect.deleteProperty(globalThis, 'document');
      }
      if (originalLocation) {
        Object.defineProperty(globalThis, 'location', originalLocation);
      } else {
        Reflect.deleteProperty(globalThis, 'location');
      }
    }
  });

  void it('handles repository paths outside src and links without path segments', (): void => {
    const icon = {};
    const emptyPath = { split: (): string[] => [] };
    const row = {
      querySelector: (selector: string): unknown =>
        selector === 'a'
          ? null
          : selector.includes('svg')
            ? icon
            : {
                textContent: 'README.md',
                getAttribute: (): string => emptyPath as unknown as string,
              },
      getAttribute: (): null => null,
    };
    const emptyPathRow = {
      querySelector: (selector: string): unknown =>
        selector.includes('svg')
          ? icon
          : {
              textContent: 'empty-path.md',
              getAttribute: (): string => emptyPath as unknown as string,
            },
      getAttribute: (): null => null,
    };
    const originalDocument = Object.getOwnPropertyDescriptor(
      globalThis,
      'document',
    );
    const originalLocation = Object.getOwnPropertyDescriptor(
      globalThis,
      'location',
    );
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: {
        documentElement: { setAttribute: (): void => undefined },
        querySelectorAll: (): Array<typeof row | typeof emptyPathRow> => [
          row,
          emptyPathRow,
        ],
        querySelector: (): null => null,
      },
    });
    Object.defineProperty(globalThis, 'location', {
      configurable: true,
      value: {
        hostname: 'bitbucket.org',
        pathname: '/workspace/repository/browse/main/',
      },
    });

    try {
      assert.deepEqual(new Bitbucket().collect(), [
        { icon, name: 'README.md', isFolder: false, isOpen: false },
        { icon, name: 'empty-path.md', isFolder: false, isOpen: false },
      ]);
    } finally {
      if (originalDocument) {
        Object.defineProperty(globalThis, 'document', originalDocument);
      } else {
        Reflect.deleteProperty(globalThis, 'document');
      }
      if (originalLocation) {
        Object.defineProperty(globalThis, 'location', originalLocation);
      } else {
        Reflect.deleteProperty(globalThis, 'location');
      }
    }
  });
});
