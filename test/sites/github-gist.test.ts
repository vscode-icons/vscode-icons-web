import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { GitHubGist } from '../../src/sites/github-gist.ts';

void describe('GitHub Gist', (): void => {
  void it('collects named file icons and ignores incomplete rows', (): void => {
    const icon = {};
    const rows = [
      {
        querySelector: (selector: string): unknown =>
          selector.includes('svg') ? icon : { textContent: '  main.ts  ' },
        getAttribute: (): null => null,
      },
      {
        querySelector: (selector: string): unknown =>
          selector.includes('svg') ? null : { textContent: 'missing icon' },
        getAttribute: (): null => null,
      },
      {
        querySelector: (selector: string): unknown =>
          selector.includes('svg') ? icon : { textContent: '   ' },
        getAttribute: (): null => null,
      },
    ];
    const originalDocument = Object.getOwnPropertyDescriptor(
      globalThis,
      'document',
    );
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: {
        documentElement: { style: { setProperty: (): void => undefined } },
        querySelectorAll: (selector: string): typeof rows =>
          selector === '.file-header' ? rows : [],
      },
    });

    try {
      const entries = new GitHubGist().collect();
      assert.deepEqual(entries, [
        { icon, name: 'main.ts', isFolder: false, isOpen: false },
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
