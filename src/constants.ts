import type { State } from '@vscode-icons/vscode-icons-api';

export const ICON_MARK_ATTRIBUTE = 'data-vscode-icons';
export const ICON_LOADING_ATTRIBUTE = 'data-vscode-icons-loading';
export const ICON_ERROR_ATTRIBUTE = 'data-vscode-icons-error';
export const ICON_SIZE_ATTRIBUTE = 'data-vscode-icons-size';
export const LOADER_MASK_PROPERTY = '--vscode-icons-loader-mask';
export const EXPANDED_ATTRIBUTE = 'aria-expanded';
export const TRUE_ATTRIBUTE_VALUE = 'true';
export const BITBUCKET_SCOPE_ATTRIBUTE = 'data-vscode-icons-bitbucket';
export const GITLAB_SCOPE_ATTRIBUTE = 'data-vscode-icons-gitlab';

export const DEFAULT_ICON_SIZE = 16;
export const DETACHED_ICON_CACHE_MS = 5000;
export const GITHUB_APPLY_DELAY_MS = 750;
export const MANIFEST_FILENAME = 'manifest.json';
export const ICON_DIRECTORY = 'icons';
export const ICON_DIRECTORY_PREFIX = `./${ICON_DIRECTORY}/`;
export const ICON_API_DIRECTORY = 'node_modules/@vscode-icons/vscode-icons-api';
export const ICON_API_SOURCE_DIRECTORY = `${ICON_API_DIRECTORY}/${ICON_DIRECTORY}`;
export const ICON_API_MANIFEST_DIRECTORY = `${ICON_API_DIRECTORY}/manifests/v1`;
export const ICON_API_MANIFEST_PATH = `${ICON_API_MANIFEST_DIRECTORY}/vsicons-icon-api.json`;
export const CLOSED_FOLDER_STATE: State = 'closed';
export const OPENED_FOLDER_STATE: State = 'opened';
export const APPLY_DELAY_MS = 100;
export const PARENT_DIRECTORY_PATH = '..';
export const ROOT_FOLDER_NAME = 'root';
export const BROWSER_CACHE_DIRECTORY = '.cache';
export const GITLAB_BIDI_MARKS_PATTERN =
  /[\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/g;

export const RELATIVE_ICON_PATH_PATTERN = /^\.\//;
export const ICON_EXTENSION_PATTERN = /\.[^.]+$/;
export const ICON_TYPE_PREFIX_PATTERN = /^(?:file|folder)_type_/;
export const OPENED_FOLDER_SUFFIX_PATTERN = /_opened$/;
export const ICON_PATH_SEPARATOR = '/';
export const PATH_SEPARATOR_LENGTH = 1;

export const LIGHT_THEME_QUERY = '(prefers-color-scheme: light)';
export const DARK_THEME_QUERY = '(prefers-color-scheme: dark)';
export const LIGHT_THEME = 'light';
export const DARK_THEME = 'dark';
export const BACKGROUND_COLOR_PATTERN = /\d+(\.\d+)?/g;
export const RED_LUMINANCE_WEIGHT = 0.299;
export const GREEN_LUMINANCE_WEIGHT = 0.587;
export const BLUE_LUMINANCE_WEIGHT = 0.114;
export const LIGHT_THEME_LUMINANCE_THRESHOLD = 128;
