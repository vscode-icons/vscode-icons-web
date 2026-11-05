import type { Entry } from '../types.ts';

import { getExtensionURL } from '../browser.ts';
import {
  EXPANDED_ATTRIBUTE,
  LOADER_MASK_PROPERTY,
  TRUE_ATTRIBUTE_VALUE,
} from '../constants.ts';

export abstract class Site {
  public abstract readonly hosts: readonly string[];

  constructor() {
    const loaderURL = getExtensionURL('images/loader.svg');
    if (loaderURL) {
      document.documentElement.style.setProperty(
        LOADER_MASK_PROPERTY,
        `url("${loaderURL}")`,
      );
    }
  }

  public matches(hostname: string): boolean {
    return this.hosts.some(
      (host: string): boolean => new URL(host).hostname === hostname,
    );
  }

  protected fromRows(
    rowSelector: string,
    iconSelector: string,
    nameSelector: string,
    isFolder: (row: Element, icon: Element) => boolean,
  ): Entry[] {
    const entries: Entry[] = [];
    for (const row of document.querySelectorAll(rowSelector)) {
      const icon = row.querySelector(iconSelector);
      const name = row.querySelector(nameSelector)?.textContent.trim();
      if (icon && name) {
        const folder = isFolder(row, icon);
        entries.push({
          icon,
          name: folder ? name.slice(name.lastIndexOf('/') + 1) : name,
          isFolder: folder,
          isOpen:
            folder &&
            row.getAttribute(EXPANDED_ATTRIBUTE) === TRUE_ATTRIBUTE_VALUE,
        });
      }
    }
    return entries;
  }

  public abstract collect(): Entry[];
}
