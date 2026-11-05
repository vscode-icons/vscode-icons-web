import type { Entry } from '../../src/types.ts';

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { GitHub } from '../../src/sites/github.ts';

interface IconStub {
  classList: { contains: () => boolean };
  getClientRects: () => unknown[];
}

void describe('GitHub', (): void => {
  void it('collects file finder results using their final path component', (): void => {
    const results = [
      { path: 'tsconfig.json', isFolder: false },
      { path: 'src/\u200btypes/\u200bservices.ts', isFolder: false },
      { path: 'test/\u200bservices', isFolder: true },
    ];
    const rows = results.map(({ path, isFolder }) => ({
      icon: {
        classList: {
          contains: (name: string): boolean =>
            name === 'octicon-file-directory-fill' && isFolder,
        },
      },
      querySelector(selector: string): unknown {
        if (selector === 'svg.octicon-file, svg.octicon-file-directory-fill') {
          return this.icon;
        }
        return selector === '[class*="HighlightMatch"], marked-text'
          ? { textContent: path }
          : null;
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
        querySelectorAll: (selector: string): typeof rows =>
          selector ===
          '#file-results-list a[role="option"], #tree-browser a.tree-browser-result[role="option"]'
            ? rows
            : [],
      },
    });

    try {
      assert.deepEqual(new GitHub().collect(), [
        {
          icon: rows[0]?.icon,
          name: 'tsconfig.json',
          isFolder: false,
          isOpen: false,
        },
        {
          icon: rows[1]?.icon,
          name: 'services.ts',
          isFolder: false,
          isOpen: false,
        },
        {
          icon: rows[2]?.icon,
          name: 'services',
          isFolder: true,
          isOpen: false,
        },
      ]);
    } finally {
      if (originalDocument) {
        Object.defineProperty(globalThis, 'document', originalDocument);
      } else {
        Reflect.deleteProperty(globalThis, 'document');
      }
    }
  });

  void it('collects virtualized finder results with highlighted filenames', (): void => {
    const icon = { classList: { contains: (): boolean => false } };
    const row = {
      querySelector: (selector: string): unknown => {
        if (selector === 'svg.octicon-file, svg.octicon-file-directory-fill') {
          return icon;
        }
        return selector.includes('marked-text')
          ? { textContent: '.github/workflows/test.yml' }
          : null;
      },
      getAttribute: (): null => null,
    };
    const originalDocument = Object.getOwnPropertyDescriptor(
      globalThis,
      'document',
    );
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: {
        querySelectorAll: (selector: string): Array<typeof row> =>
          selector.includes(
            '#tree-browser a.tree-browser-result[role="option"]',
          )
            ? [row]
            : [],
      },
    });

    try {
      assert.deepEqual(new GitHub().collect(), [
        { icon, name: 'test.yml', isFolder: false, isOpen: false },
      ]);
    } finally {
      if (originalDocument) {
        Object.defineProperty(globalThis, 'document', originalDocument);
      } else {
        Reflect.deleteProperty(globalThis, 'document');
      }
    }
  });

  void it('collects the parent directory as a folder entry', (): void => {
    const icon = {};
    const link = { textContent: '..' };
    const parentRow = {
      querySelector: (selector: string): unknown =>
        selector.includes('svg') ? icon : link,
      getAttribute: (): null => null,
    };
    const originalDocument = Object.getOwnPropertyDescriptor(
      globalThis,
      'document',
    );
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: {
        querySelectorAll: (selector: string): Array<typeof parentRow> =>
          selector === 'tr#folder-row-0' ? [parentRow] : [],
      },
    });

    try {
      assert.deepEqual(new GitHub().collect(), [
        { icon, name: '..', isFolder: true, isOpen: false },
      ]);
    } finally {
      if (originalDocument) {
        Object.defineProperty(globalThis, 'document', originalDocument);
      } else {
        Reflect.deleteProperty(globalThis, 'document');
      }
    }
  });

  void it('uses the final path component for nested folder entries', (): void => {
    const icon = {
      classList: { contains: (): boolean => true },
      getClientRects: (): unknown[] => [{}],
    };
    const row = {
      hasAttribute: (): boolean => true,
      getAttribute: (): null => null,
      querySelector: (selector: string): unknown =>
        selector.includes('svg')
          ? icon
          : selector.includes('TreeView')
            ? { textContent: 'src/components/Button' }
            : null,
    };
    const originalDocument = Object.getOwnPropertyDescriptor(
      globalThis,
      'document',
    );
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: {
        querySelectorAll: (selector: string): Array<typeof row> =>
          selector === 'li[role="treeitem"]' ? [row] : [],
      },
    });

    try {
      assert.deepEqual(new GitHub().collect(), [
        { icon, name: 'Button', isFolder: true, isOpen: false },
      ]);
    } finally {
      if (originalDocument) {
        Object.defineProperty(globalThis, 'document', originalDocument);
      } else {
        Reflect.deleteProperty(globalThis, 'document');
      }
    }
  });

  void it('collects icons only from the visible responsive repository column', (): void => {
    const icons: IconStub[] = [
      {
        classList: { contains: (): boolean => true },
        getClientRects: (): unknown[] => [{}],
      },
      {
        classList: { contains: (): boolean => true },
        getClientRects: (): unknown[] => [],
      },
    ];
    const columns = icons.map((icon: IconStub) => ({
      querySelector: (selector: string): unknown =>
        selector === 'svg'
          ? icon
          : selector === 'a'
            ? { textContent: 'src' }
            : null,
      getAttribute: (): null => null,
    }));
    const originalDocument = Object.getOwnPropertyDescriptor(
      globalThis,
      'document',
    );
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: {
        querySelectorAll: (selector: string): typeof columns =>
          selector === 'tr.react-directory-row .react-directory-filename-column'
            ? columns
            : [],
      },
    });

    try {
      const entries = new GitHub().collect();
      assert.equal(entries.length, 1);
      assert.deepEqual(
        entries.map((entry: Entry) => ({
          icon: entry.icon,
          name: entry.name,
          isFolder: entry.isFolder,
          isOpen: entry.isOpen,
        })),
        icons.slice(0, 1).map((icon: IconStub) => ({
          icon,
          name: 'src',
          isFolder: true,
          isOpen: false,
        })),
      );
    } finally {
      if (originalDocument) {
        Object.defineProperty(globalThis, 'document', originalDocument);
      } else {
        Reflect.deleteProperty(globalThis, 'document');
      }
    }
  });

  void it('collects repository file navigation icons as file entries', (): void => {
    const navigationItems = [
      { label: 'rEaDmE.md', filename: 'readme.md' },
      { label: 'CODE OF CONDUCT policy', filename: 'code_of_conduct.md' },
      { label: 'cOnTrIbUtInG guidelines', filename: 'contributing.md' },
      { label: 'GPL-3.0 LICENSE', filename: 'license' },
      { label: 'sEcUrItY policy', filename: 'security.md' },
      { label: 'More items', filename: 'more-items' },
    ];
    const rows = navigationItems.map(({ label }) => {
      const icon = { getClientRects: (): unknown[] => [{}] };
      return {
        icon,
        querySelector: (selector: string): unknown =>
          selector === 'svg.octicon'
            ? icon
            : selector === '[data-component="text"]'
              ? { textContent: label }
              : null,
        getAttribute: (): null => null,
      };
    });
    const originalDocument = Object.getOwnPropertyDescriptor(
      globalThis,
      'document',
    );
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: {
        querySelectorAll: (selector: string): typeof rows =>
          selector === 'nav[aria-label="Repository files"] a' ? rows : [],
      },
    });

    try {
      assert.deepEqual(
        new GitHub().collect().map((entry: Entry) => entry.name),
        navigationItems.slice(0, 5).map(({ filename }) => filename),
      );
    } finally {
      if (originalDocument) {
        Object.defineProperty(globalThis, 'document', originalDocument);
      } else {
        Reflect.deleteProperty(globalThis, 'document');
      }
    }
  });

  void it('sets the GitHub stylesheet scope on github.com', (): void => {
    const rootAttributes = new Map<string, string>();
    const originals = new Map(
      ['document', 'location'].map((key: string) => [
        key,
        Object.getOwnPropertyDescriptor(globalThis, key),
      ]),
    );
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: {
        documentElement: {
          setAttribute: (name: string, value: string): void => {
            rootAttributes.set(name, value);
          },
        },
      },
    });
    Object.defineProperty(globalThis, 'location', {
      configurable: true,
      value: { hostname: 'github.com' },
    });

    try {
      new GitHub();
      assert.equal(rootAttributes.get('data-vscode-icons-github'), '');
    } finally {
      for (const [key, descriptor] of originals) {
        if (descriptor) {
          Object.defineProperty(globalThis, key, descriptor);
        } else {
          Reflect.deleteProperty(globalThis, key);
        }
      }
    }
  });
});
