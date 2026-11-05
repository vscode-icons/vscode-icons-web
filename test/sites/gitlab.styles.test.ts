import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';

void describe('GitLab stylesheet', (): void => {
  void it('hides native tree and repository-heading icons', async (): Promise<void> => {
    const stylesheet = await readFile('styles/gitlab.css', 'utf8');

    assert.match(stylesheet, /html\[data-vscode-icons-gitlab\]/);
    assert.match(stylesheet, /\[data-testid='file-row'\]/);
    assert.match(stylesheet, /h1\[data-testid='repository-heading'\]/);
    assert.match(stylesheet, /visibility: hidden !important/);
    assert.match(
      stylesheet,
      /data-vscode-icons-size='32'[\s\S]*width: 32px;[\s\S]*height: 32px;/,
    );
  });

  void it('preserves the file header icon margin', async (): Promise<void> => {
    const stylesheet = await readFile('styles/gitlab.css', 'utf8');

    assert.match(
      stylesheet,
      /\.file-header-content\s+img\[data-vscode-icons\]:has\(\+ svg\.gl-mr-3\)\s*\{\s*margin-right: 8px;/,
    );
  });

  void it('aligns search result icons with their labels', async (): Promise<void> => {
    const stylesheet = await readFile('styles/gitlab.css', 'utf8');

    assert.match(
      stylesheet,
      /\.file-tree-search-result-item\s+img\[data-vscode-icons\]\s*\{\s*margin-top: 4px;/,
    );
  });

  void it('spaces blob search icons from file links', async (): Promise<void> => {
    const stylesheet = await readFile('styles/gitlab.css', 'utf8');

    assert.match(
      stylesheet,
      /\.js-blob-result\s+\.js-file-title\s+img\[data-vscode-icons\]\s*\{\s*margin-right: 8px !important;/,
    );
  });
});
