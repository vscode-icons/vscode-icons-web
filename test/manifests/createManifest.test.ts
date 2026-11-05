import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { createManifest } from '../../src/manifests/createManifest.ts';
import { browserVendor } from '../../src/types.ts';

function getManifestProperty(
  manifestObject: Record<string, unknown>,
  propertyName: string,
): unknown {
  return Reflect.get(manifestObject, propertyName);
}

void describe('browser manifests', (): void => {
  void it('uses browser-specific dynamic resource URLs', async (): Promise<void> => {
    const outputDirectory = await mkdtemp(
      join(tmpdir(), 'vscode-icons-firefox-'),
    );

    try {
      await createManifest(
        [join(outputDirectory, 'index.js')],
        outputDirectory,
        browserVendor.FIREFOX,
      );
      const firefoxManifest = JSON.parse(
        await readFile(join(outputDirectory, 'manifest.json'), 'utf8'),
      ) as Record<string, unknown>;
      const contentScripts = getManifestProperty(
        firefoxManifest,
        'content_scripts',
      ) as Array<Record<string, unknown>>;
      const webAccessibleResources = getManifestProperty(
        firefoxManifest,
        'web_accessible_resources',
      ) as Array<Record<string, unknown>>;
      const [firefoxResource] = webAccessibleResources;
      const initialContentScript = contentScripts[0] as Record<string, unknown>;
      const idleContentScript = contentScripts[1] as Record<string, unknown>;

      assert.deepEqual(getManifestProperty(initialContentScript, 'css'), [
        'styles/bitbucket.css',
        'styles/github-gist.css',
        'styles/github.css',
        'styles/gitlab.css',
        'styles/index.css',
        'styles/sourceforge.css',
      ]);
      assert.equal(
        getManifestProperty(initialContentScript, 'run_at'),
        'document_start',
      );
      assert.deepEqual(getManifestProperty(initialContentScript, 'js'), []);
      assert.deepEqual(getManifestProperty(idleContentScript, 'js'), [
        'index.js',
      ]);
      assert.deepEqual(getManifestProperty(idleContentScript, 'css'), []);
      assert.equal(
        getManifestProperty(idleContentScript, 'run_at'),
        'document_idle',
      );
      assert.deepEqual(
        getManifestProperty(initialContentScript, 'matches'),
        getManifestProperty(idleContentScript, 'matches'),
      );
      assert.ok(firefoxResource);
      assert.deepEqual(getManifestProperty(firefoxResource, 'resources'), [
        'icons/*',
        'images/loader.svg',
      ]);
      assert.equal('use_dynamic_url' in firefoxResource, false);
      assert.ok(
        (getManifestProperty(firefoxResource, 'matches') as string[]).includes(
          'https://github.com/*',
        ),
      );

      await createManifest(
        [join(outputDirectory, 'index.js')],
        outputDirectory,
        browserVendor.CHROME,
      );
      const chromeManifest = JSON.parse(
        await readFile(join(outputDirectory, 'manifest.json'), 'utf8'),
      ) as Record<string, unknown>;
      const chromeResources = getManifestProperty(
        chromeManifest,
        'web_accessible_resources',
      ) as Array<Record<string, unknown>>;
      const [chromeResource] = chromeResources;

      assert.ok(chromeResource);
      assert.equal(
        getManifestProperty(chromeResource, 'use_dynamic_url'),
        true,
      );

      await createManifest(
        [join(outputDirectory, 'index.js')],
        outputDirectory,
        browserVendor.EDGE,
      );
      const edgeManifest = JSON.parse(
        await readFile(join(outputDirectory, 'manifest.json'), 'utf8'),
      ) as Record<string, unknown>;
      const edgeResources = getManifestProperty(
        edgeManifest,
        'web_accessible_resources',
      ) as Array<Record<string, unknown>>;
      const [edgeResource] = edgeResources;

      assert.ok(edgeResource);
      assert.equal(getManifestProperty(edgeResource, 'use_dynamic_url'), true);
    } finally {
      await rm(outputDirectory, { force: true, recursive: true });
    }
  });
});
