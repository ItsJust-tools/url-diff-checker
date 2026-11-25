export type ParamChange = 'added' | 'removed' | 'changed' | 'same';

export interface QueryParam {
  key: string;
  value: string;
}

export interface HistoryEntry {
  /** Short human readable description of the comparison. */
  text: string;
  /** ISO timestamp when the entry was saved. */
  createdAt: string;
}

export interface Normalizations {
  /** Ignore the order of query parameters when comparing. */
  ignoreQueryOrder: boolean;
  /** Treat URLs with/without a trailing slash on the path as equal. */
  ignoreTrailingSlash: boolean;
  /** Compare host names case-insensitively. */
  ignoreHostCase: boolean;
}

export interface ToolState {
  /** Left URL input. */
  urlA: string;
  /** Right URL input. */
  urlB: string;
  /** Normalization toggle group. */
  normalizations: Normalizations;
  /** Saved comparison history, newest first. */
  history: HistoryEntry[];
}

export const MAX_HISTORY = 10;

export const DEFAULT_STATE: ToolState = {
  urlA: '',
  urlB: '',
  normalizations: {
    ignoreQueryOrder: false,
    ignoreTrailingSlash: false,
    ignoreHostCase: false,
  },
  history: [],
};
