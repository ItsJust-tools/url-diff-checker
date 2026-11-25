import type { ExportFormat } from '@itsjust/core';

export const toolConfig = {
  id: 'url-diff-checker',
  name: 'URL Diff Checker',
  category: 'Developer',
  description:
    'Compare two URLs and diff their protocol, host, path, and query parameters side by side.',
  version: '1.0.0',
  exportFormats: ['png', 'jpeg', 'webp', 'pdf'] as ExportFormat[],
  theme: {
    accent: '#6366f1',
  },
  features: {
    sidebar: true,
    history: true,
    keyboard: true,
    export: true,
    autoSave: true,
    undoRedo: true,
    statusBar: true,
    darkMode: true,
  },
};

export default toolConfig;
