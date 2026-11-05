import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { Codeberg } from '../../src/sites/codeberg.ts';

void describe('Codeberg', (): void => {
  void it('matches codeberg.org exactly', (): void => {
    const site = new Codeberg();

    assert.equal(site.matches('codeberg.org'), true);
    assert.equal(site.matches('notcodeberg.org'), false);
  });

  void it('collects repository files and directories', (): void => {
    const folderIcon = {
      classList: {
        contains: (name: string): boolean =>
          name === 'octicon-file-directory-fill',
      },
    };
    const fileIcon = {
      classList: { contains: (): boolean => false },
    };
    const rows = [
      { icon: folderIcon, name: '.devcontainer' },
      { icon: fileIcon, name: 'README.md' },
    ].map(({ icon, name }) => ({
      querySelector: (selector: string): unknown =>
        selector.includes('svg') ? icon : { textContent: name },
      getAttribute: (): null => null,
    }));
    const readmeIcon = {};
    const readmeHeader = {
      querySelector: (selector: string): unknown => {
        if (selector === 'svg.octicon-book') {
          return readmeIcon;
        }
        if (selector === 'strong a') {
          return { textContent: 'README.md' };
        }
        return null;
      },
      getAttribute: (): null => null,
    };
    const findRows = ['docs/README.md', 'package.json'].map(name => ({
      querySelector: (selector: string): unknown => {
        if (selector === 'td a svg.octicon-file') {
          return fileIcon;
        }
        if (selector === 'td a') {
          return { textContent: name };
        }
        return null;
      },
      getAttribute: (): null => null,
    }));
    const originalDocument = Object.getOwnPropertyDescriptor(
      globalThis,
      'document',
    );
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: {
        querySelectorAll: (selector: string): unknown[] => {
          if (selector === '#repo-files-table tr.ready') {
            return rows;
          }
          if (selector === '#readme .file-header-left') {
            return [readmeHeader];
          }
          if (selector === '#repo-find-file-table tr') {
            return findRows;
          }
          return [];
        },
      },
    });

    try {
      assert.deepEqual(
        new Codeberg().collect().map(entry => ({
          name: entry.name,
          isFolder: entry.isFolder,
          isOpen: entry.isOpen,
        })),
        [
          { name: '.devcontainer', isFolder: true, isOpen: false },
          { name: 'README.md', isFolder: false, isOpen: false },
          { name: 'README.md', isFolder: false, isOpen: false },
          { name: 'README.md', isFolder: false, isOpen: false },
          { name: 'package.json', isFolder: false, isOpen: false },
        ],
      );
      assert.equal(new Codeberg().collect()[2]?.icon, readmeIcon);
    } finally {
      if (originalDocument) {
        Object.defineProperty(globalThis, 'document', originalDocument);
      } else {
        Reflect.deleteProperty(globalThis, 'document');
      }
    }
  });

  void it('collects pull request tree and filtered file icons', (): void => {
    const makeRow = (name: string, iconClass: string) => {
      const icon = {
        classList: {
          contains: (value: string): boolean => value === iconClass,
        },
      };
      return {
        icon,
        querySelector: (selector: string): unknown => {
          if (
            selector ===
            'svg.octicon-file, svg.octicon-file-directory, svg.octicon-file-directory-fill'
          ) {
            return icon;
          }
          return selector === '.gt-ellipsis' ? { textContent: name } : null;
        },
        getAttribute: (): null => null,
      };
    };
    const rows = [
      makeRow('src/components', 'octicon-file-directory-fill'),
      makeRow('README.md', 'octicon-file'),
      makeRow('docs', 'octicon-file-directory'),
    ];
    const originalDocument = Object.getOwnPropertyDescriptor(
      globalThis,
      'document',
    );
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: {
        querySelectorAll: (selector: string): unknown[] =>
          selector ===
          '#diff-file-tree .item-directory, #diff-file-tree .item-file'
            ? rows
            : [],
      },
    });

    try {
      assert.deepEqual(new Codeberg().collect(), [
        {
          icon: rows[0]?.icon,
          name: 'components',
          isFolder: true,
          isOpen: false,
        },
        {
          icon: rows[1]?.icon,
          name: 'README.md',
          isFolder: false,
          isOpen: false,
        },
        { icon: rows[2]?.icon, name: 'docs', isFolder: true, isOpen: false },
      ]);
    } finally {
      if (originalDocument) {
        Object.defineProperty(globalThis, 'document', originalDocument);
      } else {
        Reflect.deleteProperty(globalThis, 'document');
      }
    }
  });
});
