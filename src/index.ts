import type { Theme } from '@vscode-icons/vscode-icons-api';

import type { Site } from './sites/index.ts';
import type { Entry } from './types.ts';

import { getFileIcon, getFolderIcon } from '@vscode-icons/vscode-icons-api';

import { getExtensionURL } from './browser.ts';
import * as constants from './constants.ts';
import {
  Bitbucket,
  Codeberg,
  GitHub,
  GitHubGist,
  GitLab,
  SourceForge,
} from './sites/index.ts';
import { getApplyDelayMs, scheduleInitialApply } from './startup.ts';

const sites: Site[] = [
  new GitHub(),
  new GitHubGist(),
  new GitLab(),
  new Codeberg(),
  new Bitbucket(),
  new SourceForge(),
];
const isGitHub = sites.some(
  (site: Site): boolean =>
    site instanceof GitHub && site.matches(location.hostname),
);
const applyDelayMs = getApplyDelayMs(isGitHub);

function getIconAltText(file: string): string {
  return file
    .slice(
      file.lastIndexOf(constants.ICON_PATH_SEPARATOR) +
        constants.PATH_SEPARATOR_LENGTH,
    )
    .replace(constants.ICON_EXTENSION_PATTERN, '')
    .replace(constants.ICON_TYPE_PREFIX_PATTERN, '')
    .replace(constants.OPENED_FOLDER_SUFFIX_PATTERN, '');
}

function detectTheme(): Theme {
  if (matchMedia(constants.LIGHT_THEME_QUERY).matches) {
    return constants.LIGHT_THEME;
  }
  if (matchMedia(constants.DARK_THEME_QUERY).matches) {
    return constants.DARK_THEME;
  }

  const bg = getComputedStyle(document.body).backgroundColor;
  const [r, g, b] = (bg.match(constants.BACKGROUND_COLOR_PATTERN) ?? []).map(
    Number,
  );
  if (r === undefined || g === undefined || b === undefined) {
    return constants.DARK_THEME;
  }
  return r * constants.RED_LUMINANCE_WEIGHT +
    g * constants.GREEN_LUMINANCE_WEIGHT +
    b * constants.BLUE_LUMINANCE_WEIGHT >
    constants.LIGHT_THEME_LUMINANCE_THRESHOLD
    ? constants.LIGHT_THEME
    : constants.DARK_THEME;
}

function collectEntries(hostname: string): Entry[] {
  return (
    sites.find((site: Site): boolean => site.matches(hostname))?.collect() ?? []
  );
}

const detachedIcons = new Map<string, HTMLImageElement[]>();
let detachedIconTimer: NodeJS.Timeout | undefined;

function cacheDetachedIcons(mutations: MutationRecord[]): void {
  let hasDetachedIcons = false;
  for (const mutation of mutations) {
    for (const node of mutation.removedNodes) {
      const images: HTMLImageElement[] =
        node instanceof HTMLImageElement
          ? [node]
          : node.nodeType === 1 || node.nodeType === 11
            ? Array.from(
                (node as ParentNode).querySelectorAll<HTMLImageElement>(
                  `img[${constants.ICON_MARK_ATTRIBUTE}]`,
                ),
              )
            : [];
      for (const image of images) {
        if (image.isConnected) {
          continue;
        }
        const cached = detachedIcons.get(image.src) ?? [];
        cached.push(image);
        detachedIcons.set(image.src, cached);
        hasDetachedIcons = true;
      }
    }
  }
  if (hasDetachedIcons) {
    clearTimeout(detachedIconTimer);
    detachedIconTimer = setTimeout((): void => {
      detachedIcons.clear();
      detachedIconTimer = undefined;
    }, constants.DETACHED_ICON_CACHE_MS);
  }
}

function apply(): void {
  const theme: Theme = detectTheme();
  const apiFileOptions = { theme, includePath: true };

  for (const entry of collectEntries(location.hostname)) {
    const apiFolderOptions = {
      theme,
      state: entry.isOpen
        ? constants.OPENED_FOLDER_STATE
        : constants.CLOSED_FOLDER_STATE,
      includePath: true,
    };
    const file = entry.isFolder
      ? getFolderIcon(entry.name, apiFolderOptions)
      : getFileIcon(entry.name, apiFileOptions);
    const url = getExtensionURL(
      file.replace(constants.RELATIVE_ICON_PATH_PATTERN, ''),
    );
    if (!url) {
      continue;
    }
    const icon = entry.icon as HTMLElement | SVGElement;
    const existing = entry.icon.previousElementSibling;
    if (
      existing?.getAttribute(constants.ICON_MARK_ATTRIBUTE) !== null &&
      existing instanceof HTMLImageElement
    ) {
      if (existing.src !== url) {
        existing.removeAttribute(constants.ICON_ERROR_ATTRIBUTE);
        existing.setAttribute(constants.ICON_LOADING_ATTRIBUTE, '');
        existing.src = url;
      }
      continue;
    }

    const size =
      icon.getBoundingClientRect().width || constants.DEFAULT_ICON_SIZE;
    const cached = detachedIcons.get(url);
    const reusable = cached?.pop();
    if (cached && reusable) {
      if (cached.length === 0) {
        detachedIcons.delete(url);
      }
      reusable.setAttribute(constants.ICON_SIZE_ATTRIBUTE, String(size));
      reusable.style.marginRight = getComputedStyle(icon).marginRight;
      icon.before(reusable);
      continue;
    }

    const img = document.createElement('img');
    img.style.marginRight = getComputedStyle(icon).marginRight;

    icon.before(img);

    img.setAttribute(constants.ICON_MARK_ATTRIBUTE, '');
    img.setAttribute(constants.ICON_LOADING_ATTRIBUTE, '');
    img.onload = (): void =>
      img.removeAttribute(constants.ICON_LOADING_ATTRIBUTE);
    img.onerror = (): void => {
      img.removeAttribute(constants.ICON_LOADING_ATTRIBUTE);
      img.setAttribute(constants.ICON_ERROR_ATTRIBUTE, '');
    };
    img.alt = getIconAltText(file);
    img.setAttribute(constants.ICON_SIZE_ATTRIBUTE, String(size));
    img.src = url;
  }
  if (detachedIcons.size === 0) {
    clearTimeout(detachedIconTimer);
    detachedIconTimer = undefined;
  }
}

let timer: NodeJS.Timeout | undefined;
new MutationObserver((mutations: MutationRecord[]): void => {
  cacheDetachedIcons(mutations);
  clearTimeout(timer);
  timer = undefined;
  if (
    mutations.some(
      (mutation: MutationRecord): boolean =>
        mutation.type === 'attributes' &&
        mutation.attributeName === constants.EXPANDED_ATTRIBUTE,
    )
  ) {
    apply();
    return;
  }
  timer = setTimeout(apply, applyDelayMs);
}).observe(document.documentElement, {
  attributes: true,
  attributeFilter: [constants.EXPANDED_ATTRIBUTE],
  childList: true,
  subtree: true,
});

timer = scheduleInitialApply(isGitHub, applyDelayMs, apply);
