import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getExtensionURL } from '../src/browser.ts';

void describe('getExtensionURL', (): void => {
  void it('prefers browser, falls back to chrome, and handles missing APIs', (): void => {
    const keys = ['browser', 'chrome'];
    const originals = new Map(
      keys.map((key: string) => [
        key,
        Object.getOwnPropertyDescriptor(globalThis, key),
      ]),
    );

    try {
      Object.defineProperty(globalThis, 'browser', {
        configurable: true,
        value: {
          runtime: {
            getURL: (path: string): string => `safari-extension://test/${path}`,
          },
        },
      });
      Object.defineProperty(globalThis, 'chrome', {
        configurable: true,
        value: {
          runtime: {
            getURL: (path: string): string => `chrome-extension://test/${path}`,
          },
        },
      });
      assert.equal(
        getExtensionURL('icons/file.svg'),
        'safari-extension://test/icons/file.svg',
      );

      Reflect.deleteProperty(globalThis, 'browser');
      assert.equal(
        getExtensionURL('icons/file.svg'),
        'chrome-extension://test/icons/file.svg',
      );

      Reflect.deleteProperty(globalThis, 'chrome');
      assert.equal(getExtensionURL('icons/file.svg'), undefined);

      Object.defineProperty(globalThis, 'browser', {
        configurable: true,
        value: {
          runtime: {
            getURL: (): never => {
              throw new Error('Extension context invalidated');
            },
          },
        },
      });
      assert.equal(getExtensionURL('icons/file.svg'), undefined);
    } finally {
      for (const key of keys) {
        const descriptor = originals.get(key);
        if (descriptor) {
          Object.defineProperty(globalThis, key, descriptor);
        } else {
          Reflect.deleteProperty(globalThis, key);
        }
      }
    }
  });
});
