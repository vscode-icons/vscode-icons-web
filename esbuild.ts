/// <reference types="node" />

import type { BuildResult, Message } from 'esbuild';

import { build } from 'esbuild';

import {
  packageExtensions as createExtensionPackages,
  postBundle,
  preBundle,
} from './src/utils.ts';

const packageBuild = process.argv.includes('--package');
const debugBuild = process.argv.includes('--debug');
const outDir = debugBuild ? 'extension' : 'dist';

try {
  await preBundle(outDir, debugBuild);

  const bundle: BuildResult = await build({
    entryPoints: ['src/index.ts'],
    outfile: `${outDir}/index.js`,
    bundle: true,
    minify: !debugBuild,
    sourcemap: debugBuild ? 'inline' : false,
    format: 'iife',
    platform: 'browser',
    target: ['chrome130', 'edge130', 'firefox130'],
    metafile: true,
  });

  if (bundle.errors.length > 0) {
    throw new Error(
      `Build failed with errors:\n ${bundle.errors
        .map((error: Message): string => error.text)
        .join('\n')}`,
    );
  }

  if (packageBuild) {
    await createExtensionPackages(bundle.metafile?.outputs, outDir);
  } else {
    await postBundle(bundle.metafile?.outputs, outDir, process.env.BROWSER);
  }
} catch (error) {
  console.error(
    `Error: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
}
