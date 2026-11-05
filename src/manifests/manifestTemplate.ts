export const manifestTemplate = {
  manifest_version: 3,
  name: 'VSCode Icons Web',
  description: '__DESCRIPTION__',
  version: '__VERSION__',
  icons: {},
  content_scripts: [
    {
      matches: [],
      js: [],
      css: [],
      run_at: 'document_start',
    },
    {
      matches: [],
      js: [],
      css: [],
      run_at: 'document_idle',
    },
  ],
  web_accessible_resources: [
    {
      resources: [],
      matches: [],
    },
  ],
} as const;
