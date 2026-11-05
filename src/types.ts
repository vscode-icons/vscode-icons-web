export const browserVendor = {
  FIREFOX: 'FIREFOX',
  EDGE: 'EDGE',
  CHROME: 'CHROME',
} as const;

export type BrowserVendor = (typeof browserVendor)[keyof typeof browserVendor];

export interface Entry {
  icon: Element;
  name: string;
  isFolder: boolean;
  isOpen: boolean;
}

export interface ExtensionAPI {
  runtime: {
    getURL(path: string): string;
  };
}

export interface ExtensionGlobals {
  browser?: ExtensionAPI;
  chrome?: ExtensionAPI;
}

export interface ContentScript {
  matches: string[];
  js: string[];
  css: string[];
  run_at: string;
}

export interface WebAccessibleResource {
  resources: string[];
  matches: string[];
}

export interface ChromeWebAccessibleResource extends WebAccessibleResource {
  use_dynamic_url: boolean;
}

export interface PackageInfo {
  name: string;
  description: string;
  version: string;
}
