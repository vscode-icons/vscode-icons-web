import type { PackageInfo } from './types.ts';

import console from 'node:console';
import { createWriteStream } from 'node:fs';
import {
  access,
  cp,
  mkdtemp,
  readFile,
  realpath,
  rm,
  symlink,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';

import {
  Browser,
  computeExecutablePath,
  detectBrowserPlatform,
  install,
  resolveBuildId,
} from '@puppeteer/browsers';
import { ZipArchive } from 'archiver';

import * as constants from './constants.ts';
import { createManifest } from './manifests/createManifest.ts';
import { browserVendor } from './types.ts';

export function toPascalCase(browser: Browser): string {
  return browser.charAt(0).toUpperCase() + browser.slice(1).toLowerCase();
}

export async function installBrowserForTesting(
  browser: Browser,
): Promise<void> {
  const cacheDirectory = join(
    process.cwd(),
    constants.BROWSER_CACHE_DIRECTORY,
    browser,
  );
  const stableExecutablePath = join(cacheDirectory, 'browser');
  try {
    // Check if the stable executable path already exists
    // If it does, we assume the browser is already installed
    // and return early
    await access(stableExecutablePath);
    await realpath(stableExecutablePath);
    return;
  } catch (error) {
    if (
      !(error instanceof Error) ||
      (error as NodeJS.ErrnoException).code !== 'ENOENT'
    ) {
      throw error;
    }
  }

  const platform = detectBrowserPlatform();
  if (!platform) {
    throw new Error(
      `${toPascalCase(browser)} for Testing is not available on this platform.`,
    );
  }

  const tag = browser === Browser.CHROMIUM ? 'latest' : 'stable';
  const buildId = await resolveBuildId(browser, platform, tag);
  const executablePath = computeExecutablePath({
    browser,
    buildId,
    cacheDir: cacheDirectory,
    platform,
  });
  try {
    await access(executablePath);
  } catch (error) {
    if (
      !(error instanceof Error) ||
      (error as NodeJS.ErrnoException).code !== 'ENOENT'
    ) {
      throw error;
    }
    console.info(`Installing ${toPascalCase(browser)} for Testing...`);
    await install({ browser, buildId, cacheDir: cacheDirectory, platform });
  }

  await rm(stableExecutablePath, { force: true });
  await symlink(executablePath, stableExecutablePath, 'file');
}

export function getIconAltText(file: string): string {
  return file
    .slice(
      file.lastIndexOf(constants.ICON_PATH_SEPARATOR) +
        constants.PATH_SEPARATOR_LENGTH,
    )
    .replace(constants.ICON_EXTENSION_PATTERN, '')
    .replace(constants.ICON_TYPE_PREFIX_PATTERN, '')
    .replace(constants.OPENED_FOLDER_SUFFIX_PATTERN, '');
}

export function collectIconPaths(
  value: unknown,
  paths = new Set<string>(),
): Set<string> {
  if (
    typeof value === 'string' &&
    value.startsWith(constants.ICON_DIRECTORY_PREFIX)
  ) {
    paths.add(value);
  } else if (Array.isArray(value)) {
    value.forEach((entry: unknown): void => {
      collectIconPaths(entry, paths);
    });
  } else if (typeof value === 'object' && value !== null) {
    Object.values(value).forEach((entry: unknown): void => {
      collectIconPaths(entry, paths);
    });
  }
  return paths;
}

// Copies icons from the API source directory to the output directory,
// adding generic fallbacks for missing icons.
// This ensures that all required icons are available in the output directory,
// even if some are missing from the API source.
// Note: It should not happen under normal circumstances,
// as all required icons should be present in the API source.
export async function copyIconsWithFallbacks(
  outputDirectory: string,
): Promise<void> {
  const iconSourceDirectory = constants.ICON_API_SOURCE_DIRECTORY;
  const iconOutputDirectory = join(outputDirectory, constants.ICON_DIRECTORY);
  await cp(iconSourceDirectory, iconOutputDirectory, { recursive: true });

  const apiManifestPath = constants.ICON_API_MANIFEST_PATH;
  const apiManifest: unknown = JSON.parse(
    await readFile(apiManifestPath, 'utf8'),
  );

  const missingIcons: string[] = [];
  for (const iconPath of collectIconPaths(apiManifest)) {
    try {
      await access(
        join(
          iconSourceDirectory,
          iconPath.slice(constants.ICON_DIRECTORY_PREFIX.length),
        ),
      );
    } catch (error) {
      if (
        !(error instanceof Error) ||
        (error as NodeJS.ErrnoException).code !== 'ENOENT'
      ) {
        throw error;
      }
      const filename = iconPath.slice(iconPath.lastIndexOf('/') + 1);
      const fallbackIcon = filename.startsWith('folder_type_')
        ? filename.endsWith('_opened.svg')
          ? 'default_folder_opened.svg'
          : 'default_folder.svg'
        : 'default_file.svg';
      await cp(
        join(iconOutputDirectory, fallbackIcon),
        join(
          outputDirectory,
          constants.ICON_DIRECTORY,
          iconPath.slice(constants.ICON_DIRECTORY_PREFIX.length),
        ),
      );
      missingIcons.push(iconPath);
    }
  }
  if (missingIcons.length > 0) {
    console.info(
      `Added generic fallbacks for ${missingIcons.length} missing API icons.`,
    );
  }
}

export async function preBundle(
  outputDirectory: string,
  debugBuild: boolean,
): Promise<void> {
  await copyIconsWithFallbacks(outputDirectory);

  if (!debugBuild) {
    return;
  }

  switch (process.env.BROWSER) {
    case browserVendor.CHROME:
      await installBrowserForTesting(Browser.CHROME);
      break;
    case browserVendor.FIREFOX:
      await installBrowserForTesting(Browser.FIREFOX);
      break;
    case browserVendor.EDGE:
      await installBrowserForTesting(Browser.CHROMIUM);
      break;
    default:
      throw new Error(`Unsupported browser: ${process.env.BROWSER}`);
  }
}

export async function postBundle(
  bundleOutputs: Record<string, unknown> | undefined,
  outputDirectory: string,
  browser?: string,
): Promise<void> {
  if (!bundleOutputs) {
    throw new Error('No bundle outputs provided.');
  }
  await cp('images', `${outputDirectory}/images`, { recursive: true });
  await cp('styles', `${outputDirectory}/styles`, { recursive: true });
  switch (browser) {
    case browserVendor.FIREFOX:
    case browserVendor.EDGE:
    case browserVendor.CHROME:
      await createManifest(
        Object.keys(bundleOutputs),
        outputDirectory,
        browser,
      );
      break;
    default:
      throw new Error(`Unsupported browser: ${process.env.BROWSER}`);
  }
}

export async function getPackageInfo(): Promise<PackageInfo> {
  return JSON.parse(await readFile('package.json', 'utf8')) as PackageInfo;
}

export async function packageExtensions(
  bundleOutputs: Record<string, unknown> | undefined,
  outputDirectory: string,
): Promise<void> {
  if (!bundleOutputs) {
    throw new Error('No bundle outputs provided.');
  }
  const packageInfo: PackageInfo = await getPackageInfo();
  const archiveNames = new Set<string>();
  const stagingDirectory = await mkdtemp(
    join(tmpdir(), `${packageInfo.name}-`),
  );
  try {
    const stagedBundleOutputs: Record<string, unknown> = {};
    for (const output of Object.keys(bundleOutputs)) {
      const stagedOutput = join(stagingDirectory, basename(output));
      await cp(output, stagedOutput);
      stagedBundleOutputs[stagedOutput] = bundleOutputs[output];
    }

    // Copy the icon directory to the staging directory
    await cp(
      join(outputDirectory, constants.ICON_DIRECTORY),
      join(stagingDirectory, constants.ICON_DIRECTORY),
      { recursive: true },
    );

    // Remove the bundle outputs and the icon directory
    // from the output directory
    for (const output of Object.keys(bundleOutputs)) {
      await rm(output, { force: true, recursive: true });
    }
    await rm(join(outputDirectory, constants.ICON_DIRECTORY), {
      force: true,
      recursive: true,
    });

    // Create archives for each browser-specific bundle
    for (const browser of Object.values(browserVendor)) {
      const archiveName = `${packageInfo.name}-${browser.toLowerCase()}-${packageInfo.version}.zip`;
      archiveNames.add(archiveName);

      // Perform post-bundle processing specific to the browser
      await postBundle(stagedBundleOutputs, stagingDirectory, browser);

      // Create the archive for the staged bundle outputs
      const archive = new ZipArchive({ zlib: { level: 9 } });
      const archivePath = join(outputDirectory, archiveName);
      const archiveOutput = createWriteStream(archivePath);
      const archiveClosed = new Promise<void>((resolve, reject): void => {
        archiveOutput.once('close', resolve);
        archiveOutput.once('error', reject);
        archive.once('error', reject);
      });
      archive.pipe(archiveOutput);
      archive.directory(stagingDirectory, false);
      await archive.finalize();
      await archiveClosed;
    }
  } finally {
    await rm(stagingDirectory, { force: true, recursive: true });
  }
}
