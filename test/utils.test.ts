import type * as Utils from '../src/utils.ts';

import assert from 'node:assert/strict';
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  readlink,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { Browser } from '@puppeteer/browsers';
import esmock from 'esmock';
import { stub } from 'sinon';

import * as constants from '../src/constants.ts';
import { browserVendor } from '../src/types.ts';
import {
  collectIconPaths,
  getPackageInfo,
  packageExtensions,
  postBundle,
  toPascalCase,
} from '../src/utils.ts';

const browserModule = '@puppeteer/browsers';
const constantsModule = '../src/constants.ts';
const fsPromisesModule = 'node:fs/promises';

void describe('utility helpers', (): void => {
  void it('formats browser names as Pascal case', (): void => {
    assert.equal(toPascalCase(Browser.CHROME), 'Chrome');
    assert.equal(toPascalCase(Browser.CHROMIUM), 'Chromium');
  });

  void it('collects unique icon paths recursively', (): void => {
    const existingPaths = new Set(['./icons/existing.svg']);
    const paths = collectIconPaths(
      {
        nested: [
          './icons/file_type_ts.svg',
          { folder: './icons/folder_type_src.svg' },
          './not-icons/file.svg',
          null,
          1,
        ],
        duplicate: './icons/file_type_ts.svg',
      },
      existingPaths,
    );

    assert.equal(paths, existingPaths);
    assert.deepEqual([...paths].sort(), [
      './icons/existing.svg',
      './icons/file_type_ts.svg',
      './icons/folder_type_src.svg',
    ]);
  });
});

void describe('installBrowserForTesting', (): void => {
  void it('reuses a cached browser and repairs missing or broken links', async (): Promise<void> => {
    const directory = await mkdtemp(join(tmpdir(), 'browser-cache-test-'));
    const originalDirectory = process.cwd();
    const cacheDirectory = join(directory, '.cache', Browser.CHROME);
    const executablePath = join(directory, 'executable');
    const stableExecutablePath = join(cacheDirectory, 'browser');
    const resolveBuildId = stub().resolves('test-build');
    const install = stub().callsFake(async (): Promise<void> => {
      await writeFile(executablePath, 'browser');
    });

    try {
      await mkdir(cacheDirectory, { recursive: true });
      await writeFile(executablePath, 'browser');
      await symlink(executablePath, stableExecutablePath);
      process.chdir(directory);

      const { installBrowserForTesting } = await esmock<typeof Utils>(
        '../src/utils.ts',
        {
          [fsPromisesModule]: {
            access: (path: string): Promise<void> =>
              path === stableExecutablePath ? Promise.resolve() : access(path),
          },
          [browserModule]: {
            resolveBuildId,
            computeExecutablePath: (): string => executablePath,
            install,
          },
        },
      );

      await installBrowserForTesting(Browser.CHROME);
      assert.equal(resolveBuildId.callCount, 0);
      assert.equal(install.callCount, 0);

      await rm(stableExecutablePath);
      await installBrowserForTesting(Browser.CHROME);
      assert.equal(resolveBuildId.callCount, 1);
      assert.equal(install.callCount, 0);
      assert.equal(await readlink(stableExecutablePath), executablePath);

      await rm(executablePath);
      await installBrowserForTesting(Browser.CHROME);
      assert.equal(resolveBuildId.callCount, 2);
      assert.equal(install.callCount, 1);
      assert.equal(await readlink(stableExecutablePath), executablePath);
    } finally {
      process.chdir(originalDirectory);
      await rm(directory, { force: true, recursive: true });
    }
  });

  void it('uses the Chromium latest build and reports unavailable platforms', async (): Promise<void> => {
    const directory = await mkdtemp(join(tmpdir(), 'browser-platform-test-'));
    const originalDirectory = process.cwd();
    const executablePath = join(directory, 'chromium');
    const resolveBuildId = stub().resolves('latest-build');

    try {
      await mkdir(join(directory, '.cache', Browser.CHROMIUM), {
        recursive: true,
      });
      await writeFile(executablePath, 'browser');
      process.chdir(directory);
      const { installBrowserForTesting: installChromium } = await esmock<
        typeof Utils
      >('../src/utils.ts', {
        [browserModule]: {
          detectBrowserPlatform: (): string => 'linux',
          resolveBuildId,
          computeExecutablePath: (): string => executablePath,
        },
      });

      await installChromium(Browser.CHROMIUM);
      assert.equal(resolveBuildId.args[0]?.[2], 'latest');

      const { installBrowserForTesting: installUnsupported } = await esmock<
        typeof Utils
      >('../src/utils.ts', {
        [browserModule]: {
          detectBrowserPlatform: (): undefined => undefined,
        },
      });
      await assert.rejects(
        installUnsupported(Browser.FIREFOX),
        /Firefox for Testing is not available on this platform/,
      );
    } finally {
      process.chdir(originalDirectory);
      await rm(directory, { force: true, recursive: true });
    }
  });

  void it('propagates unexpected browser-cache access errors', async (): Promise<void> => {
    const accessError = Object.assign(new Error('permission denied'), {
      code: 'EACCES',
    });
    const { installBrowserForTesting: installWithAccessError } = await esmock<
      typeof Utils
    >('../src/utils.ts', {
      [fsPromisesModule]: {
        access: (): Promise<never> => Promise.reject(accessError),
      },
    });

    await assert.rejects(
      installWithAccessError(Browser.CHROME),
      (error: unknown): boolean => error === accessError,
    );

    const missingError = Object.assign(new Error('missing'), {
      code: 'ENOENT',
    });
    let accessCount = 0;
    const { installBrowserForTesting: installWithExecutableError } =
      await esmock<typeof Utils>('../src/utils.ts', {
        [fsPromisesModule]: {
          access: (): Promise<void> => {
            accessCount += 1;
            return Promise.reject(
              accessCount === 1 ? missingError : accessError,
            );
          },
        },
        [browserModule]: {
          detectBrowserPlatform: (): string => 'linux',
          resolveBuildId: (): Promise<string> => Promise.resolve('test-build'),
          computeExecutablePath: (): string => '/tmp/test-browser',
        },
      });
    await assert.rejects(
      installWithExecutableError(Browser.CHROME),
      (error: unknown): boolean => error === accessError,
    );
  });
});

void describe('bundle utilities', (): void => {
  void it('copies missing icons from the appropriate generic fallbacks', async (): Promise<void> => {
    const directory = await mkdtemp(join(tmpdir(), 'icon-fallback-test-'));
    const sourceDirectory = join(directory, 'source');
    const outputDirectory = join(directory, 'output');
    const manifestPath = join(directory, 'manifest.json');
    const sourceIcons = join(sourceDirectory, 'icons');

    try {
      await mkdir(sourceIcons, { recursive: true });
      await mkdir(outputDirectory);
      await writeFile(join(sourceIcons, 'default_file.svg'), 'file fallback');
      await writeFile(
        join(sourceIcons, 'default_folder.svg'),
        'folder fallback',
      );
      await writeFile(
        join(sourceIcons, 'default_folder_opened.svg'),
        'opened folder fallback',
      );
      await writeFile(join(sourceIcons, 'existing.svg'), 'existing');
      await writeFile(
        manifestPath,
        JSON.stringify({
          nested: [
            './icons/file_missing.svg',
            './icons/folder_type_missing.svg',
            './icons/folder_type_missing_opened.svg',
            './icons/existing.svg',
          ],
        }),
      );

      const { copyIconsWithFallbacks: copyFromFixture } = await esmock<
        typeof Utils
      >('../src/utils.ts', {
        [constantsModule]: {
          ...constants,
          ['ICON_API_SOURCE_DIRECTORY']: sourceIcons,
          ['ICON_API_MANIFEST_PATH']: manifestPath,
        },
      });

      await copyFromFixture(outputDirectory);
      assert.equal(
        await readFile(
          join(outputDirectory, 'icons', 'file_missing.svg'),
          'utf8',
        ),
        'file fallback',
      );
      assert.equal(
        await readFile(
          join(outputDirectory, 'icons', 'folder_type_missing.svg'),
          'utf8',
        ),
        'folder fallback',
      );
      assert.equal(
        await readFile(
          join(outputDirectory, 'icons', 'folder_type_missing_opened.svg'),
          'utf8',
        ),
        'opened folder fallback',
      );
      assert.equal(
        await readFile(join(outputDirectory, 'icons', 'existing.svg'), 'utf8'),
        'existing',
      );

      await writeFile(manifestPath, JSON.stringify('./icons/existing.svg'));
      await copyFromFixture(join(directory, 'complete-output'));

      const accessError = Object.assign(new Error('permission denied'), {
        code: 'EACCES',
      });
      const { copyIconsWithFallbacks: copyWithAccessError } = await esmock<
        typeof Utils
      >('../src/utils.ts', {
        [fsPromisesModule]: {
          cp: (): Promise<void> => Promise.resolve(),
          readFile: (): Promise<string> =>
            Promise.resolve(JSON.stringify('./icons/missing.svg')),
          access: (): Promise<never> => Promise.reject(accessError),
        },
        [constantsModule]: {
          ...constants,
          ['ICON_API_SOURCE_DIRECTORY']: sourceIcons,
          ['ICON_API_MANIFEST_PATH']: manifestPath,
        },
      });
      await assert.rejects(
        copyWithAccessError(outputDirectory),
        (error: unknown): boolean => error === accessError,
      );
    } finally {
      await rm(directory, { force: true, recursive: true });
    }
  });

  void it('runs browser-specific pre- and post-bundle steps', async (): Promise<void> => {
    const directory = await mkdtemp(join(tmpdir(), 'bundle-hooks-test-'));
    const originalDirectory = process.cwd();
    const originalBrowser = process.env.BROWSER;
    const sourceDirectory = join(directory, 'source');
    const manifestPath = join(directory, 'api-manifest.json');
    const sourceIcons = join(sourceDirectory, 'icons');
    const outputDirectory = join(directory, 'output');

    try {
      await mkdir(sourceIcons, { recursive: true });
      await mkdir(outputDirectory);
      await writeFile(join(sourceIcons, 'default_file.svg'), 'fallback');
      await writeFile(manifestPath, JSON.stringify('./icons/default_file.svg'));
      process.chdir(directory);

      const { preBundle: preBundleWithFixture } = await esmock<typeof Utils>(
        '../src/utils.ts',
        {
          [constantsModule]: {
            ...constants,
            ['ICON_API_SOURCE_DIRECTORY']: sourceIcons,
            ['ICON_API_MANIFEST_PATH']: manifestPath,
          },
        },
      );

      await preBundleWithFixture(outputDirectory, false);
      for (const browser of [
        Browser.CHROME,
        Browser.FIREFOX,
        Browser.CHROMIUM,
      ]) {
        const browserCache = join(
          directory,
          constants.BROWSER_CACHE_DIRECTORY,
          browser,
        );
        await mkdir(browserCache, { recursive: true });
        await writeFile(join(browserCache, 'browser'), 'installed');
      }

      const browserVendors: Array<[string, string]> = [
        [browserVendor.CHROME, Browser.CHROME],
        [browserVendor.FIREFOX, Browser.FIREFOX],
        [browserVendor.EDGE, Browser.CHROMIUM],
      ];
      for (const [vendor, browser] of browserVendors) {
        process.env.BROWSER = vendor;
        await preBundleWithFixture(outputDirectory, true);
        assert.equal(
          await readFile(join(directory, '.cache', browser, 'browser'), 'utf8'),
          'installed',
        );
      }

      process.env.BROWSER = 'SAFARI';
      await assert.rejects(
        preBundleWithFixture(outputDirectory, true),
        /Unsupported browser: SAFARI/,
      );

      process.chdir(originalDirectory);
      for (const browser of [
        browserVendor.CHROME,
        browserVendor.FIREFOX,
        browserVendor.EDGE,
      ]) {
        await postBundle({ ['bundle.js']: {} }, outputDirectory, browser);
        assert.ok(
          (await readdir(outputDirectory)).includes(
            constants.MANIFEST_FILENAME,
          ),
        );
      }
      await assert.rejects(
        postBundle({ ['bundle.js']: {} }, outputDirectory, 'SAFARI'),
        /Unsupported browser: SAFARI/,
      );
      await assert.rejects(
        postBundle(undefined, outputDirectory),
        /No bundle outputs provided/,
      );
      assert.equal((await getPackageInfo()).name, 'vscode-icons-web');
    } finally {
      process.chdir(originalDirectory);
      if (originalBrowser === undefined) {
        delete process.env.BROWSER;
      } else {
        process.env.BROWSER = originalBrowser;
      }
      await rm(directory, { force: true, recursive: true });
    }
  });

  void it('packages browser archives and removes staged inputs', async (): Promise<void> => {
    const outputDirectory = await mkdtemp(
      join(tmpdir(), 'extension-package-test-'),
    );
    const iconDirectory = join(outputDirectory, constants.ICON_DIRECTORY);
    const bundlePath = join(outputDirectory, 'bundle.js');

    try {
      await mkdir(iconDirectory);
      await writeFile(join(iconDirectory, 'test.svg'), 'icon');
      await writeFile(bundlePath, 'bundle');

      const { name, version } = await getPackageInfo();
      await packageExtensions({ [bundlePath]: {} }, outputDirectory);

      for (const browser of Object.values(browserVendor)) {
        const archive = `${name}-${browser.toLowerCase()}-${version}.zip`;
        assert.ok((await readFile(join(outputDirectory, archive))).length > 0);
      }
      assert.ok(!(await readdir(outputDirectory)).includes('bundle.js'));
      assert.ok(!(await readdir(outputDirectory)).includes('icons'));
      await assert.rejects(
        packageExtensions(undefined, outputDirectory),
        /No bundle outputs provided/,
      );
    } finally {
      await rm(outputDirectory, { force: true, recursive: true });
    }
  });
});
