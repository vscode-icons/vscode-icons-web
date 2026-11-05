import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';

import { stub, useFakeTimers } from 'sinon';

import {
  APPLY_DELAY_MS,
  DETACHED_ICON_CACHE_MS,
  GITHUB_APPLY_DELAY_MS,
} from '../src/constants.ts';
import { getApplyDelayMs, scheduleInitialApply } from '../src/startup.ts';

void describe('icon replacement', (): void => {
  void it('updates expanded folders and tracks icon loading and errors', async (): Promise<void> => {
    class Image {
      public src = '';
      public alt = '';
      public style = { marginRight: '' };
      public attributes = new Map<string, string>();
      public onload: (() => void) | null = null;
      public onerror: (() => void) | null = null;
      public nextElementSibling: unknown = null;
      public isConnected = false;

      public setAttribute(name: string, value: string): void {
        this.attributes.set(name, value);
      }

      public getAttribute(name: string): string | null {
        return this.attributes.get(name) ?? null;
      }

      public hasAttribute(name: string): boolean {
        return this.attributes.has(name);
      }

      public removeAttribute(name: string): void {
        this.attributes.delete(name);
      }
    }

    let expanded = false;
    let folder = true;
    let rowVisible = true;
    let selectedTheme = 'light';
    let backgroundColor = 'rgb(255, 255, 255)';
    let extensionAvailable = true;
    const iconWidth = 16;
    let observerCallback: MutationCallback | undefined;
    let observerOptions: MutationObserverInit | undefined;
    const location = { hostname: 'github.com' };
    const body = {};
    const headElements: unknown[] = [];
    const documentAttributes = new Map<string, string>();
    const documentStyles = new Map<string, string>();
    const createIcon = (width: number) => ({
      previousElementSibling: null as Image | null,
      getBoundingClientRect: (): { width: number } => ({ width }),
      before(image: Image): void {
        this.previousElementSibling = image;
        image.nextElementSibling = this;
        image.isConnected = true;
      },
    });
    let currentIcon = createIcon(iconWidth);
    const row = {
      querySelector: (selector: string): unknown =>
        selector.includes('svg') ? currentIcon : { textContent: 'src' },
      hasAttribute: (name: string): boolean =>
        name === 'aria-expanded' && folder,
      getAttribute: (): string => String(expanded),
    };
    const getCurrentImage = (): Image | null =>
      currentIcon.previousElementSibling;
    const globals: Array<[string, unknown]> = [
      [
        'document',
        {
          documentElement: {
            setAttribute: (name: string, value: string): void => {
              documentAttributes.set(name, value);
            },
            style: {
              setProperty: (name: string, value: string): void => {
                documentStyles.set(name, value);
              },
            },
          },
          body,
          head: {
            append: (element: unknown): void => {
              headElements.push(element);
            },
          },
          querySelectorAll: (selector: string): Array<typeof row> =>
            selector === 'li[role="treeitem"]' && rowVisible ? [row] : [],
          createElement: (): Image => new Image(),
        },
      ],
      ['location', location],
      [
        'matchMedia',
        (query: string): { matches: boolean } => ({
          matches:
            query === '(prefers-color-scheme: light)'
              ? selectedTheme === 'light'
              : selectedTheme === 'dark',
        }),
      ],
      [
        'getComputedStyle',
        (element: unknown): { backgroundColor: string; marginRight: string } =>
          element === body
            ? { backgroundColor, marginRight: '' }
            : { backgroundColor: '', marginRight: '8px' },
      ],
      [
        'chrome',
        {
          runtime: {
            getURL: (path: string): string =>
              extensionAvailable
                ? `extension://test/${path}`
                : (undefined as unknown as string),
          },
        },
      ],
      ['HTMLImageElement', Image],
      [
        'MutationObserver',
        stub().callsFake((callback: MutationCallback) => {
          observerCallback = callback;
          return {
            observe: (
              _target: unknown,
              options: MutationObserverInit,
            ): void => {
              observerOptions = options;
            },
          };
        }),
      ],
    ];
    const originals = new Map(
      globals.map(([key]: [string, unknown]) => [
        key,
        Object.getOwnPropertyDescriptor(globalThis, key),
      ]),
    );
    const clock = useFakeTimers();
    for (const [key, value] of globals) {
      Object.defineProperty(globalThis, key, { configurable: true, value });
    }

    try {
      await import('../src/index.ts');
      assert.equal(getCurrentImage(), null);
      clock.tick(GITHUB_APPLY_DELAY_MS);
      const image = getCurrentImage();
      assert.ok(image);
      assert.deepEqual(headElements, []);
      assert.ok(documentAttributes.has('data-vscode-icons-github'));
      assert.equal(
        documentStyles.get('--vscode-icons-loader-mask'),
        'url("extension://test/images/loader.svg")',
      );
      assert.equal(image.attributes.get('data-vscode-icons-size'), '16');
      assert.equal(image.style.marginRight, '8px');
      const closedSrc = image.src;
      assert.ok(image.hasAttribute('data-vscode-icons-loading'));
      image.onload?.();
      assert.equal(image.hasAttribute('data-vscode-icons-loading'), false);
      assert.ok(observerOptions?.attributeFilter?.includes('aria-expanded'));

      selectedTheme = 'dark';
      observerCallback?.(
        [{ type: 'childList', removedNodes: [] } as unknown as MutationRecord],
        {} as MutationObserver,
      );
      clock.tick(GITHUB_APPLY_DELAY_MS);

      selectedTheme = 'system';
      for (const color of [
        'rgb(255)',
        'rgb(255, 255)',
        'rgb(255, 255, 255)',
        'rgb(0, 0, 0)',
        'invalid',
      ]) {
        backgroundColor = color;
        observerCallback?.(
          [
            {
              type: 'childList',
              removedNodes: [],
            } as unknown as MutationRecord,
          ],
          {} as MutationObserver,
        );
        clock.tick(GITHUB_APPLY_DELAY_MS);
      }

      currentIcon = createIcon(24);
      rowVisible = false;
      image.isConnected = false;
      observerCallback?.(
        [
          {
            type: 'childList',
            removedNodes: [
              image as unknown as Node,
              {
                nodeType: 1,
                querySelectorAll: (): Image[] => {
                  const connectedImage = new Image();
                  connectedImage.isConnected = true;
                  return [connectedImage];
                },
              } as unknown as Node,
              {
                nodeType: 11,
                querySelectorAll: (): Image[] => [],
              } as unknown as Node,
              { nodeType: 3 } as unknown as Node,
            ],
          } as unknown as MutationRecord,
        ],
        {} as MutationObserver,
      );
      clock.tick(GITHUB_APPLY_DELAY_MS);

      rowVisible = true;
      observerCallback?.(
        [
          {
            type: 'childList',
            removedNodes: [],
          } as unknown as MutationRecord,
        ],
        {} as MutationObserver,
      );
      clock.tick(GITHUB_APPLY_DELAY_MS);

      assert.equal(currentIcon.previousElementSibling, image);
      assert.equal(image.hasAttribute('data-vscode-icons-loading'), false);
      assert.equal(image.attributes.get('data-vscode-icons-size'), '24');

      currentIcon = createIcon(iconWidth);
      image.isConnected = false;
      observerCallback?.(
        [
          {
            type: 'childList',
            removedNodes: [image as unknown as Node],
          } as unknown as MutationRecord,
        ],
        {} as MutationObserver,
      );
      clock.tick(GITHUB_APPLY_DELAY_MS);
      assert.equal(currentIcon.previousElementSibling, image);
      assert.equal(image.attributes.get('data-vscode-icons-size'), '16');

      expanded = true;
      assert.ok(observerCallback);
      observerCallback(
        [
          {
            type: 'attributes',
            attributeName: 'aria-expanded',
            removedNodes: [],
          } as unknown as MutationRecord,
        ],
        {} as MutationObserver,
      );

      assert.equal(currentIcon.previousElementSibling, image);
      assert.notEqual(image.src, closedSrc);
      assert.match(image.src, /_opened\.svg$/);
      assert.ok(image.hasAttribute('data-vscode-icons-loading'));
      image.onload?.();
      assert.equal(image.hasAttribute('data-vscode-icons-loading'), false);

      image.onerror?.();
      assert.equal(image.hasAttribute('data-vscode-icons-loading'), false);
      assert.ok(image.hasAttribute('data-vscode-icons-error'));

      folder = false;
      observerCallback(
        [
          {
            type: 'attributes',
            attributeName: 'aria-expanded',
            removedNodes: [],
          } as unknown as MutationRecord,
        ],
        {} as MutationObserver,
      );

      currentIcon = createIcon(0);
      observerCallback(
        [
          {
            type: 'attributes',
            attributeName: 'aria-expanded',
            removedNodes: [],
          } as unknown as MutationRecord,
        ],
        {} as MutationObserver,
      );
      assert.equal(
        currentIcon.previousElementSibling?.attributes.get(
          'data-vscode-icons-size',
        ),
        '16',
      );

      extensionAvailable = false;
      currentIcon = createIcon(16);
      observerCallback(
        [
          {
            type: 'attributes',
            attributeName: 'aria-expanded',
            removedNodes: [],
          } as unknown as MutationRecord,
        ],
        {} as MutationObserver,
      );
      assert.equal(currentIcon.previousElementSibling, null);

      location.hostname = 'unsupported.example';
      observerCallback(
        [{ type: 'childList', removedNodes: [] } as unknown as MutationRecord],
        {} as MutationObserver,
      );
      clock.tick(GITHUB_APPLY_DELAY_MS);

      const staleImage = new Image();
      staleImage.src = 'extension://test/stale.svg';
      observerCallback(
        [
          {
            type: 'childList',
            removedNodes: [staleImage as unknown as Node],
          } as unknown as MutationRecord,
        ],
        {} as MutationObserver,
      );
      clock.tick(GITHUB_APPLY_DELAY_MS + DETACHED_ICON_CACHE_MS);
    } finally {
      clock.restore();
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

void describe('non-GitHub content script startup', (): void => {
  void it('applies immediately when the host is not GitHub', (): void => {
    const clock = useFakeTimers();
    let applyCount = 0;

    try {
      assert.equal(getApplyDelayMs(false), APPLY_DELAY_MS);
      assert.equal(
        scheduleInitialApply(false, APPLY_DELAY_MS, (): void => {
          applyCount += 1;
        }),
        undefined,
      );
      assert.equal(applyCount, 1);
      assert.equal(clock.countTimers(), 0);
    } finally {
      clock.restore();
    }
  });
});

void describe('icon replacement stylesheet', (): void => {
  void it('controls icon visibility and size in CSS', async (): Promise<void> => {
    const stylesheet = await readFile('styles/index.css', 'utf8');

    assert.match(stylesheet, /data-vscode-icons-error[\s\S]*display: none/);
    assert.match(stylesheet, /:is\(svg, \[role='img'\]\)[\s\S]*display: none/);
    assert.match(stylesheet, /img\[data-vscode-icons\][\s\S]*width: 16px/);
    assert.match(stylesheet, /mask: var\(--vscode-icons-loader-mask\)/);
  });

  void it('provides a browser-independent fallback for Gist loaders', async (): Promise<void> => {
    const stylesheet = await readFile('styles/index.css', 'utf8');
    const gistStylesheet = await readFile('styles/github-gist.css', 'utf8');

    assert.match(
      stylesheet,
      /--vscode-icons-fallback-loader-mask: url\('data:image\/svg\+xml,/,
    );
    assert.match(gistStylesheet, /var\(--vscode-icons-fallback-loader-mask\)/);
    assert.doesNotMatch(gistStylesheet, /chrome-extension:\/\//);
  });

  void it('renders Gist loaders on the file icon wrapper', async (): Promise<void> => {
    const stylesheet = await readFile('styles/github-gist.css', 'utf8');

    assert.match(
      stylesheet,
      /span:has\([\s\S]*?> svg\.octicon:not\(\s*img\[data-vscode-icons\]:not\(\[data-vscode-icons-loading\]\) \+ svg\s*\)[\s\S]*?\)::before\s*\{[^}]*content: ''[^}]*mask:/,
    );
    assert.match(
      stylesheet,
      /svg\.octicon:not\(\s*img\[data-vscode-icons\]:not\(\[data-vscode-icons-loading\]\) \+ svg\s*\)\s*\{\s*display: none/,
    );
    assert.match(
      stylesheet,
      /img\[data-vscode-icons\]\[data-vscode-icons-loading\]\s*\{\s*display: none !important/,
    );
  });
});

void describe('icon alt text', (): void => {
  void it('formats file and opened folder icon names', async (): Promise<void> => {
    const { getIconAltText } = await import('../src/utils.ts');

    assert.equal(
      getIconAltText('./icons/file_type_typescript.svg'),
      'typescript',
    );
    assert.equal(getIconAltText('./icons/folder_type_src_opened.svg'), 'src');
  });
});
