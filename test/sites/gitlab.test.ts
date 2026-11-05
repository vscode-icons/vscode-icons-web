import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { GITLAB_SCOPE_ATTRIBUTE } from '../../src/constants.ts';
import { GitLab } from '../../src/sites/gitlab.ts';

void describe('GitLab', (): void => {
  void it('scopes GitLab tree icon styles to gitlab.com', (): void => {
    const attributes = new Map<string, string>();
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
            attributes.set(name, value);
          },
        },
      },
    });
    Object.defineProperty(globalThis, 'location', {
      configurable: true,
      value: { hostname: 'gitlab.com' },
    });

    try {
      new GitLab();
      assert.equal(attributes.get(GITLAB_SCOPE_ATTRIBUTE), '');
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

  void it('matches its configured hostname exactly', (): void => {
    const site = new GitLab();

    assert.equal(site.matches('gitlab.com'), true);
    assert.equal(site.matches('notgitlab.com'), false);
  });

  void it('collects folder icons from the sidebar tree', (): void => {
    const treeItem = {
      getAttribute: (name: string): string | null =>
        name === 'aria-label' ? '.agents' : null,
    };
    const icon = {
      getAttribute: (name: string): string | null =>
        name === 'data-testid' ? 'folder-icon' : null,
      classList: {
        contains: (name: string): boolean => name === 'folder-icon',
      },
      closest: (selector: string): typeof treeItem | null =>
        selector === 'li[role="treeitem"]' ? treeItem : null,
    };
    const row = {
      querySelector: (selector: string): unknown =>
        selector.includes('svg') ? icon : { textContent: 'src' },
      getAttribute: (): null => null,
      hasAttribute: (): boolean => false,
    };
    const originalDocument = Object.getOwnPropertyDescriptor(
      globalThis,
      'document',
    );
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: {
        querySelectorAll: (selector: string): Array<typeof row> =>
          selector.includes('li[role="treeitem"]') ? [row] : [],
      },
    });

    try {
      assert.deepEqual(new GitLab().collect(), [
        { icon, name: '.agents', isFolder: true, isOpen: false },
      ]);
    } finally {
      if (originalDocument) {
        Object.defineProperty(globalThis, 'document', originalDocument);
      } else {
        Reflect.deleteProperty(globalThis, 'document');
      }
    }
  });

  void it('cleans file names before resolving file icons', (): void => {
    const icon = {
      getAttribute: (name: string): string | null =>
        name === 'data-testid' ? 'file-icon' : null,
      classList: { contains: (): boolean => false },
      closest: (): null => null,
    };
    const row = {
      querySelector: (selector: string): unknown =>
        selector.includes('svg')
          ? icon
          : { textContent: 'README\u200e.md\u200e' },
      getAttribute: (): null => null,
      hasAttribute: (): boolean => false,
    };
    const originalDocument = Object.getOwnPropertyDescriptor(
      globalThis,
      'document',
    );
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: {
        querySelectorAll: (selector: string): Array<typeof row> =>
          selector.includes('li[role="treeitem"]') ? [row] : [],
      },
    });

    try {
      assert.deepEqual(new GitLab().collect(), [
        { icon, name: 'README.md', isFolder: false, isOpen: false },
      ]);
    } finally {
      if (originalDocument) {
        Object.defineProperty(globalThis, 'document', originalDocument);
      } else {
        Reflect.deleteProperty(globalThis, 'document');
      }
    }
  });

  void it('collects sidebar file icons without a file-icon marker', (): void => {
    const icon = {
      getAttribute: (): null => null,
      classList: { contains: (): boolean => false },
      closest: (): null => null,
    };
    const row = {
      querySelector: (selector: string): unknown => {
        if (selector.includes('[data-testid="file-row"] svg')) {
          return icon;
        }
        if (selector.includes('svg')) {
          return null;
        }
        return { textContent: 'README.md' };
      },
      getAttribute: (): null => null,
      hasAttribute: (): boolean => false,
    };
    const originalDocument = Object.getOwnPropertyDescriptor(
      globalThis,
      'document',
    );
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: {
        querySelectorAll: (selector: string): Array<typeof row> =>
          selector.includes('li[role="treeitem"]') ? [row] : [],
      },
    });

    try {
      assert.deepEqual(new GitLab().collect(), [
        { icon, name: 'README.md', isFolder: false, isOpen: false },
      ]);
    } finally {
      if (originalDocument) {
        Object.defineProperty(globalThis, 'document', originalDocument);
      } else {
        Reflect.deleteProperty(globalThis, 'document');
      }
    }
  });

  void it('collects highlighted search results by file name', (): void => {
    const icon = {};
    const row = {
      querySelector: (selector: string): unknown => {
        if (selector === 'svg') {
          return icon;
        }
        return selector === 'span.gl-block'
          ? { textContent: 'docs/README\u200e.md' }
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
          selector === '.file-tree-search-result-item' ? [row] : [],
      },
    });

    try {
      assert.deepEqual(new GitLab().collect(), [
        { icon, name: 'README.md', isFolder: false, isOpen: false },
      ]);
    } finally {
      if (originalDocument) {
        Object.defineProperty(globalThis, 'document', originalDocument);
      } else {
        Reflect.deleteProperty(globalThis, 'document');
      }
    }
  });

  void it('collects file finder results by their final path component', (): void => {
    const icon = {};
    const row = {
      querySelector: (selector: string): unknown => {
        if (selector === 'td.tree-item-file-name a svg') {
          return icon;
        }
        return selector === 'td.tree-item-file-name a .str-truncated'
          ? { textContent: 'docs/README\u200e.md' }
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
          selector === '.tree-content-holder .tree-table tr.tree-item'
            ? [row]
            : [],
      },
    });

    try {
      assert.deepEqual(new GitLab().collect(), [
        { icon, name: 'README.md', isFolder: false, isOpen: false },
      ]);
    } finally {
      if (originalDocument) {
        Object.defineProperty(globalThis, 'document', originalDocument);
      } else {
        Reflect.deleteProperty(globalThis, 'document');
      }
    }
  });

  void it('collects blob search results with and without native icons', (): void => {
    const link = { textContent: 'docs/README\u200e.md' };
    const icon = {};
    const legacyRow = {
      querySelector: (selector: string): unknown =>
        selector === ':scope > a' ? link : null,
      getAttribute: (): null => null,
    };
    const vueRow = {
      querySelector: (selector: string): unknown => {
        if (selector === 'svg:has(use[href*="/file_icons/"])') {
          return icon;
        }
        return selector === '[data-testid="file-name-content"]'
          ? { textContent: 'config/index.json' }
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
        querySelectorAll: (selector: string): unknown[] => {
          if (selector === '.js-blob-result .js-file-title') {
            return [legacyRow];
          }
          return selector ===
            'div.gl-flex.gl-items-center.gl-leading-1:has([data-testid="file-name-content"])'
            ? [vueRow]
            : [];
        },
      },
    });

    try {
      assert.deepEqual(new GitLab().collect(), [
        { icon: link, name: 'README.md', isFolder: false, isOpen: false },
        { icon, name: 'index.json', isFolder: false, isOpen: false },
      ]);
    } finally {
      if (originalDocument) {
        Object.defineProperty(globalThis, 'document', originalDocument);
      } else {
        Reflect.deleteProperty(globalThis, 'document');
      }
    }
  });

  void it('collects diff tree folders and filtered files', (): void => {
    const makeRow = (name: string, folder: boolean, open: boolean) => {
      const label = {
        textContent: 'truncated',
        getAttribute: (attribute: string): string | null =>
          attribute === 'data-qa-file-name' ? name : null,
      };
      const icon = {
        classList: {
          contains: (value: string): boolean =>
            folder && value === 'folder-icon',
        },
      };
      const row = {
        querySelector: (selector: string): unknown =>
          selector.includes('svg.folder-icon') ? icon : label,
        getAttribute: (attribute: string): string | null =>
          attribute === 'aria-expanded' ? String(open) : null,
      };
      return { row, icon };
    };
    const folder = makeRow('app/models', true, true);
    const file = makeRow('app/models/application_setting.rb', false, false);
    const closedFolder = makeRow('config', true, false);
    const noLabel = { querySelector: (): null => null };
    const noName = {
      querySelector: (selector: string): unknown =>
        selector.includes('svg.folder-icon')
          ? file.icon
          : { getAttribute: (): null => null },
    };
    const originalDocument = Object.getOwnPropertyDescriptor(
      globalThis,
      'document',
    );
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: {
        querySelectorAll: (selector: string): unknown[] =>
          selector === '.diff-file-row [data-testid="file-row"]'
            ? [folder.row, file.row, closedFolder.row, noLabel, noName]
            : [],
      },
    });

    try {
      assert.deepEqual(new GitLab().collect(), [
        { icon: folder.icon, name: 'models', isFolder: true, isOpen: true },
        {
          icon: file.icon,
          name: 'application_setting.rb',
          isFolder: false,
          isOpen: false,
        },
        {
          icon: closedFolder.icon,
          name: 'config',
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

  void it('collects the selected folder heading as an opened folder', (): void => {
    const icon = { classList: { contains: (): boolean => true } };
    const heading = {
      textContent: 'images\u200e',
      querySelector: (selector: string): unknown =>
        selector.includes('svg.folder-icon') ? icon : null,
    };
    const originalDocument = Object.getOwnPropertyDescriptor(
      globalThis,
      'document',
    );
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: {
        querySelectorAll: (selector: string): Array<typeof heading> =>
          selector === 'h1[data-testid="repository-heading"]' ? [heading] : [],
      },
    });

    try {
      assert.deepEqual(new GitLab().collect(), [
        { icon, name: 'images', isFolder: true, isOpen: true },
      ]);
    } finally {
      if (originalDocument) {
        Object.defineProperty(globalThis, 'document', originalDocument);
      } else {
        Reflect.deleteProperty(globalThis, 'document');
      }
    }
  });

  void it('collects the file-view heading and blob header icons', (): void => {
    const headingIcon = { classList: { contains: (): boolean => false } };
    const blobIcon = {};
    const heading = {
      textContent: 'README\u200e.md\u200e',
      querySelector: (selector: string): unknown =>
        selector.includes('/file_icons/') ? headingIcon : null,
    };
    const blobHeader = {
      querySelector: (selector: string): unknown =>
        selector.includes('/file_icons/')
          ? blobIcon
          : { textContent: 'README\u200e.md\u200e' },
      getAttribute: (): null => null,
    };
    const originalDocument = Object.getOwnPropertyDescriptor(
      globalThis,
      'document',
    );
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: {
        querySelectorAll: (selector: string): unknown[] => {
          if (selector === 'h1[data-testid="repository-heading"]') {
            return [heading];
          }
          return selector === '.file-header-content' ? [blobHeader] : [];
        },
      },
    });

    try {
      assert.deepEqual(new GitLab().collect(), [
        {
          icon: headingIcon,
          name: 'README.md',
          isFolder: false,
          isOpen: false,
        },
        { icon: blobIcon, name: 'README.md', isFolder: false, isOpen: false },
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
