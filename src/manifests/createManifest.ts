import type {
  BrowserVendor,
  ChromeWebAccessibleResource,
  ContentScript,
  PackageInfo,
  WebAccessibleResource,
} from '../types.ts';

import { readdir, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

import * as constants from '../constants.ts';
import { supportedHosts } from '../sites/supported-hosts.ts';
import { browserVendor } from '../types.ts';
import { getPackageInfo } from '../utils.ts';
import { manifestTemplate } from './manifestTemplate.ts';

export async function createManifest(
  bundleOutputs: string[],
  outputDirectory: string,
  browser: BrowserVendor,
): Promise<void> {
  const packageInfo: PackageInfo = await getPackageInfo();
  const matches = Object.values(supportedHosts).flat();
  const scripts = bundleOutputs
    .filter((output: string): boolean => output.endsWith('.js'))
    .map((output: string): string =>
      relative(outputDirectory, output).split(sep).join('/'),
    );
  const styles = (await readdir('styles', { withFileTypes: true }))
    .filter((entry): boolean => entry.isFile() && entry.name.endsWith('.css'))
    .map((entry): string => join('styles', entry.name).split(sep).join('/'))
    .sort();
  const icons: Record<string, string> = {};
  for (const entry of await readdir('images', { withFileTypes: true })) {
    const size = /^logo(\d+)\.png$/i.exec(entry.name)?.[1];
    if (entry.isFile() && size) {
      icons[size] = `images/${entry.name}`;
    }
  }
  const resources = [`${constants.ICON_DIRECTORY}/*`, 'images/loader.svg'];
  const webAccessibleResources = manifestTemplate.web_accessible_resources.map(
    (resource): WebAccessibleResource => ({
      ...resource,
      matches,
      resources,
    }),
  );
  const manifest = {
    ...manifestTemplate,
    description: packageInfo.description,
    version: packageInfo.version,
    icons,
    content_scripts: manifestTemplate.content_scripts.map(
      (script): ContentScript => ({
        ...script,
        matches,
        js: script.run_at === 'document_idle' ? scripts : [],
        css: script.run_at === 'document_start' ? styles : [],
      }),
    ),
    web_accessible_resources:
      browser === browserVendor.FIREFOX
        ? webAccessibleResources
        : webAccessibleResources.map(
            (resource): ChromeWebAccessibleResource => ({
              ...resource,
              use_dynamic_url: true,
            }),
          ),
  };

  await writeFile(
    join(outputDirectory, constants.MANIFEST_FILENAME),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
}
