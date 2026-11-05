import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';

void describe('SourceForge stylesheet', (): void => {
  void it('sizes the breadcrumb folder icon to its font size', async (): Promise<void> => {
    const stylesheet = await readFile('styles/sourceforge.css', 'utf8');

    assert.match(
      stylesheet,
      /#content_base\s+h2\.title\s*> span\s*> a:has\(> b\.fa-folder-open-o\[title=['"]Root directory['"]\]\)\s*> img\[data-vscode-icons\]\s*\{\s*width: 1em;\s*height: 1em;/,
    );
  });

  void it('hides the breadcrumb folder icon after its replacement loads', async (): Promise<void> => {
    const stylesheet = await readFile('styles/sourceforge.css', 'utf8');

    assert.match(
      stylesheet,
      /#content_base\s+h2\.title\s*> span\s*> a:has\(> b\.fa-folder-open-o\[title=['"]Root directory['"]\]\)\s*> img\[data-vscode-icons\]:not\(\[data-vscode-icons-error\]\):not\(\s*\[data-vscode-icons-loading\]\s*\)\s*\+ b\.fa-folder-open-o\s*\{\s*display: none/,
    );
  });

  void it('shows a loader from page load and restores the original icon on error', async (): Promise<void> => {
    const stylesheet = await readFile('styles/sourceforge.css', 'utf8');

    assert.match(
      stylesheet,
      /> b\.fa-folder-open-o\[title='Root directory'\]\s*\{[^}]*width: 1em;[^}]*height: 1em;[^}]*--vscode-icons-loader-mask[^}]*animation: vscode-icons-spin/,
    );
    assert.match(
      stylesheet,
      /> b\.fa-folder-open-o\[title='Root directory'\]::before\s*\{\s*visibility: hidden/,
    );
    assert.match(
      stylesheet,
      /img\[data-vscode-icons\]\[data-vscode-icons-error\]\s*\+ b\.fa-folder-open-o\[title='Root directory'\]\s*\{[^}]*mask: none;[^}]*animation: none/,
    );
    assert.match(
      stylesheet,
      /img\[data-vscode-icons\]\[data-vscode-icons-error\]\s*\+ b\.fa-folder-open-o\[title='Root directory'\]::before\s*\{\s*visibility: visible/,
    );
  });

  void it('hides original icons until the replacement fails', async (): Promise<void> => {
    const stylesheet = await readFile('styles/sourceforge.css', 'utf8');

    assert.match(
      stylesheet,
      /#files_list\s+th\s+a\s+img\[data-vscode-icons\]:not\(\[data-vscode-icons-error\]\)\s*\+ :is\(\.icon, i\)\s*\{\s*display: none/,
    );
  });

  void it('shows a loader on SourceForge SVG icons until replacements load', async (): Promise<void> => {
    const stylesheet = await readFile('styles/sourceforge.css', 'utf8');

    assert.match(
      stylesheet,
      /svg:not\(img\[data-vscode-icons\]:not\(\[data-vscode-icons-loading\]\) \+ svg\)/,
    );
    assert.match(stylesheet, /--vscode-icons-loader-mask/);
    assert.equal(
      stylesheet.match(/var\(--vscode-icons-fallback-loader-mask\)/g)?.length,
      3,
    );
    assert.doesNotMatch(stylesheet, /chrome-extension:\/\//);
    assert.match(stylesheet, /animation: vscode-icons-spin/);
    assert.match(stylesheet, /\+ svg\s*\{\s*display: inline-block !important/);
  });
});
