import type { ExtensionGlobals } from './types.ts';

export function getExtensionURL(path: string): string | undefined {
  const extensionGlobals = globalThis as ExtensionGlobals;
  const extensionAPI = extensionGlobals.browser ?? extensionGlobals.chrome;
  try {
    return extensionAPI?.runtime.getURL(path);
  } catch {
    return undefined;
  }
}
