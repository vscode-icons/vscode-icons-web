import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { SourceForge } from '../../src/sites/sourceforge.ts';

void describe('SourceForge', (): void => {
  void it('collects the root breadcrumb as an open folder', (): void => {
    const icon = {};
    const originalDocument = Object.getOwnPropertyDescriptor(
      globalThis,
      'document',
    );
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: {
        querySelectorAll: (selector: string): unknown[] =>
          selector.includes('h2.title') ? [icon] : [],
      },
    });

    try {
      assert.deepEqual(new SourceForge().collect(), [
        {
          icon,
          name: 'Root directory',
          isFolder: true,
          isOpen: true,
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

  void it('collects Git tree folders and files', (): void => {
    const makeRow = (name: string, folder: boolean) => {
      const icon = {
        classList: {
          contains: (className: string): boolean =>
            folder && className === 'fa-folder',
        },
      };
      return {
        icon,
        querySelector: (selector: string): unknown =>
          selector.endsWith('i.fa') ? icon : { textContent: `\u00a0${name}` },
        getAttribute: (): null => null,
      };
    };
    const rows = [makeRow('apps', true), makeRow('README.md', false)];
    const originalDocument = Object.getOwnPropertyDescriptor(
      globalThis,
      'document',
    );
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: {
        querySelectorAll: (selector: string): typeof rows =>
          selector.includes('#content_base') ? rows : [],
      },
    });

    try {
      assert.deepEqual(new SourceForge().collect(), [
        { icon: rows[0]?.icon, name: 'apps', isFolder: true, isOpen: false },
        {
          icon: rows[1]?.icon,
          name: 'README.md',
          isFolder: false,
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
});
