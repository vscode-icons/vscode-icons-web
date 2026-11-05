# Repository Guide

VSCode Icons Web is a TypeScript browser extension that replaces file and folder
icons on supported code hosting sites.

## Project Structure

```
images/                         # Extension images
src/
  browser.ts                    # Browser API helpers
  constants.ts                  # Shared constants
  index.ts                      # Entry point and site registration
  startup.ts                    # Initial icon application
  types.ts                      # Shared types
  utils.ts                      # Manifest, browser, and packaging helpers
  manifests/                    # Shared manifest generation
    createManifest.ts
    manifestTemplate.ts
  sites/                        # Hosting-site handlers and host definitions
    bitbucket.ts
    codeberg.ts
    github-gist.ts
    github.ts
    gitlab.ts
    site.ts
    sourceforge.ts
    supported-hosts.ts
styles/                         # Site-specific stylesheets
test/                           # Node.js tests, organized by feature
  manifests/
  sites/
esbuild.ts                      # Build and packaging entry point
```

## Development

- Use Node.js version as mentioned in `package.json` `engines` property.
- Use native ES modules and strict TypeScript.
- Target browsers: Google Chrome, Mozilla Firefox, and Microsoft Edge (Edge uses
  Chromium).
- `npm test` runs the Node.js test suite and enforces 100% per-file coverage for
  lines, functions, branches, and statements in `src/**/*.ts`.
- `npm run build:dev` runs the TypeScript build.
- `npm run dist` builds for one browser. Set `BROWSER=CHROME`,
  `BROWSER=FIREFOX`, or `BROWSER=EDGE` to select a browser.
- `npm run package` builds browser-specific packages for all supported browsers.
- `npm run debug:extension` creates a debug build. Set `BROWSER=CHROME`,
  `BROWSER=FIREFOX`, or `BROWSER=EDGE` to select a browser. Debug builds fetch
  the browser for testing with `@puppeteer/browsers` and store it under
  `.cache/`.
- Identify runtime or visual issues using `chrome` browser installed under
  `.cache/`. Use `playwright`as fallback.
- Exercise the extension on supported sites against all cached browsers
  installed under `.cache/`.
- `build:dev`, `dist`, `debug:extension`, and `package` run cleanup first,
  removing `coverage/`, `out/`, `extension/`, and `dist/`.
- `npm run format` formats the repository.
- `npm run lint` runs ESLint with autofix. Review changes after running
  autofixing commands.
- `npm run lint:md` checks and rewrites Markdown.

## Conventions

- Keep TypeScript strict and consistent with the code style below.
- Put shared interfaces and type declarations in `src/types.ts`.
- Keep site-specific behavior in its site implementation; add a stylesheet when
  needed and scope its selectors to that site. Follow neighboring test patterns.
- To add site support, create `src/sites/<site>.ts`, export it from
  `src/sites/index.ts`, register it in `src/index.ts`, add its host to
  `src/sites/supported-hosts.ts`, add tests under `test/sites/`, and update the
  supported-sites list in `README.md`. Add `styles/<site>.css` and stylesheet
  tests when needed. Generated manifests derive host matches from the supported
  hosts and include every stylesheet; edit manifest code only when
  browser-specific manifest behavior needs to change.
- Keep manifest generation in `src/manifests/`; pass the browser vendor to
  `createManifest` when browser-specific manifest behavior is needed.
- Preserve existing browser-specific behavior and manifest differences when
  changing shared extension code.

## Code Style

- Follow the repository’s formatting and lint conventions.
- Follow the repository’s TypeScript settings.

## Validation

- Run the relevant tests, then `npm test` for broader coverage when behavior
  changes.
- For changed files, run:
  - `npx prettier --check <files>`
  - `npx eslint <files>`
  - `npx remark <files> --quiet --frail` for Markdown, so warnings fail as in
    CI.
- `npm run check` formats the repository, then runs ESLint with autofix and
  Remark with output enabled. Review the resulting diff because this command can
  modify files.

## Commit Convention

Use conventional commits with scope:

```
feat(icon): add support for parcel
feat(folder): add cargo folder icon
fix(icon): correct extension for typescript
chore(version): bump to 12.17.0
```

## PR Convention

- Use a concise title with a Conventional Commit prefix.
- Reference the related issue in the description, for example `Fixes #123`.
- Summarize the behavior or files changed and list the validation performed.
