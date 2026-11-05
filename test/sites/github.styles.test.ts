import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';

void describe('GitHub stylesheet', (): void => {
  void it('shows a loader in repository cells until icons are replaced', async (): Promise<void> => {
    const stylesheet = await readFile('styles/github.css', 'utf8');

    assert.match(
      stylesheet,
      /\.react-directory-filename-column:not\(:has\(img\[data-vscode-icons\]\)\)\s*> svg\s*\{[^}]*visibility:\s*hidden/,
    );
    assert.match(
      stylesheet,
      /\.react-directory-filename-column:not\(:has\(img\[data-vscode-icons\]\)\)::before\s*\{[^}]*inset:\s*0 auto 0 0;[^}]*margin:\s*auto 0;[^}]*mask:\s*var\(--vscode-icons-loader-mask\)[^}]*animation:\s*vscode-icons-spin/,
    );
  });

  void it('uses the extension loader for the tree loading row', async (): Promise<void> => {
    const stylesheet = await readFile('styles/github.css', 'utf8');

    assert.match(stylesheet, /html\[data-vscode-icons-github\]/);
    assert.match(stylesheet, /data-loading='true'/);
    assert.match(stylesheet, /ItemVisual[\s\S]*::after/);
    assert.match(stylesheet, /mask: var\(--vscode-icons-loader-mask\)/);
    assert.doesNotMatch(
      stylesheet,
      /li\[role='treeitem'\]\[data-loading='true'\]\s*\{\s*display:\s*none/,
    );
  });

  void it('hides repository tab icons and shows a loader until replaced', async (): Promise<void> => {
    const stylesheet = await readFile('styles/github.css', 'utf8');

    assert.match(
      stylesheet,
      /nav\[aria-label='Repository files'\][\s\S]*> span\[data-component='icon'\]:not\([\s\S]*img\[data-vscode-icons\]\[data-vscode-icons-error\][\s\S]*\)\s*> svg\.octicon\s*\{[^}]*visibility:\s*hidden\s*!important/,
    );
    assert.match(
      stylesheet,
      /nav\[aria-label='Repository files'\][\s\S]*> span\[data-component='icon'\]:not\(:has\(img\[data-vscode-icons\]\)\)::before\s*\{[^}]*mask:[\s\S]*vscode-icons-fallback-loader-mask[^}]*animation:\s*vscode-icons-spin/,
    );
  });

  void it('hides stale tree icons while extension icons load', async (): Promise<void> => {
    const stylesheet = await readFile('styles/github.css', 'utf8');

    assert.match(
      stylesheet,
      /svg\.octicon:not\(\[class\*='chevron'\]\)[\s\S]*visibility: hidden/,
    );
    assert.match(
      stylesheet,
      /:has\([\s\S]*svg\.octicon:not\(\[class\*='chevron'\]\)[\s\S]*::after[\s\S]*mask: var\(--vscode-icons-loader-mask\)/,
    );
  });
});
