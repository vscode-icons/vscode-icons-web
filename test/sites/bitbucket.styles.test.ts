import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';

void describe('Bitbucket stylesheet', (): void => {
  void it('scopes 24px icons to Bitbucket pages', async (): Promise<void> => {
    const stylesheet = await readFile('styles/bitbucket.css', 'utf8');
    const sharedStylesheet = await readFile('styles/index.css', 'utf8');

    assert.match(stylesheet, /html\[data-vscode-icons-bitbucket\]/);
    assert.match(stylesheet, /data-vscode-icons-size='24'[\s\S]*width: 24px/);
    assert.match(
      stylesheet,
      /\[role='img'\]\[aria-label='Directory'\]\s*> img\[data-vscode-icons\][\s\S]*width: 24px;\s*height: 24px/,
    );
    assert.doesNotMatch(sharedStylesheet, /data-vscode-icons-size='24'/);
  });
});
