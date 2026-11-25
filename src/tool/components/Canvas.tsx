'use client';

import React from 'react';
import {
  addedParams,
  breakdownText,
  changedParams,
  parseUrl,
  paramLabels,
  queryValueViews,
  removedParams,
  unifiedQueryDiff,
  urlsEqual,
} from '../ui-shared';
import { DEFAULT_STATE, type Normalizations, type ToolState } from '../types';

interface CanvasProps {
  state: ToolState;
  onChange?: (state: ToolState) => void;
  onSaveHistory?: (text: string) => void;
}

const inputClass =
  'mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100';

const NORMALIZATIONS: { key: keyof Normalizations; label: string; testid: string }[] = [
  {
    key: 'ignoreQueryOrder',
    label: 'Ignore query order',
    testid: 'norm-ignore-query-order',
  },
  {
    key: 'ignoreTrailingSlash',
    label: 'Ignore trailing slash',
    testid: 'norm-ignore-trailing-slash',
  },
  {
    key: 'ignoreHostCase',
    label: 'Ignore host case',
    testid: 'norm-ignore-host-case',
  },
];

const SAMPLES: [string, string] = [
  'https://example.com/search?q=term&page=2&sort=asc',
  'https://example.com/search/?q=term&sort=asc&page=2&lang=en',
];

function CopyButton({ value, testid }: { value: string; testid?: string }) {
  const [copied, setCopied] = React.useState(false);
  const handleCopy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable; ignore
    }
  }, [value]);
  return (
    <button
      type="button"
      onClick={handleCopy}
      data-testid={testid}
      className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
      aria-label="Copy value"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

const LABEL_BADGE: Record<string, string> = {
  added: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
  removed: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
  changed: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  same: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
};

export const Canvas: React.FC<CanvasProps> = ({ state, onChange, onSaveHistory }) => {
  const update = (patch: Partial<ToolState>) => onChange?.({ ...state, ...patch });

  const parsedA = parseUrl(state.urlA);
  const parsedB = parseUrl(state.urlB);
  const equal = parsedA && parsedB ? urlsEqual(parsedA, parsedB, state.normalizations) : null;

  const diffA = parsedA ? parsedA.query : [];
  const diffB = parsedB ? parsedB.query : [];
  const added = addedParams(diffA, diffB);
  const removed = removedParams(diffA, diffB);
  const changed = changedParams(diffA, diffB);
  const labels = paramLabels(diffA, diffB);
  const diffLines = unifiedQueryDiff(diffA, diffB);

  const sample = () => {
    onChange?.({
      ...state,
      urlA: SAMPLES[0],
      urlB: SAMPLES[1],
    });
  };

  return (
    <div className="p-4 space-y-6 overflow-y-auto h-full" data-testid="diff-canvas">
      <div className="grid gap-4 md:grid-cols-2">
        {(['urlA', 'urlB'] as const).map((side, i) => (
          <label key={side} className="block text-xs font-medium text-gray-700 dark:text-gray-300">
            URL {i + 1}
            <input
              type="text"
              value={state[side]}
              onChange={(e) => update({ [side]: e.target.value })}
              data-testid={`input-url-${side === 'urlA' ? 'a' : 'b'}`}
              placeholder="https://example.com/path?query=1"
              className={inputClass}
            />
          </label>
        ))}
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="URL inputs actions">
        <button
          type="button"
          onClick={sample}
          data-testid="btn-sample"
          className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Load sample
        </button>
        <button
          type="button"
          onClick={() => {
            try {
              const text = window.prompt('Paste URL');
              if (text) update({ urlA: text.trim() });
            } catch {
              // prompt unavailable
            }
          }}
          data-testid="btn-paste-a"
          className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Paste into URL 1
        </button>
        <button
          type="button"
          onClick={() => {
            try {
              const text = window.prompt('Paste URL');
              if (text) update({ urlB: text.trim() });
            } catch {
              // prompt unavailable
            }
          }}
          data-testid="btn-paste-b"
          className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Paste into URL 2
        </button>
        <button
          type="button"
          onClick={() => onChange?.({ ...DEFAULT_STATE, history: state.history })}
          data-testid="btn-clear"
          className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Clear
        </button>
      </div>

      <div className="flex flex-wrap gap-4" role="group" aria-label="Normalization toggles">
        {NORMALIZATIONS.map((norm) => (
          <label
            key={norm.key}
            className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300"
          >
            <input
              type="checkbox"
              checked={state.normalizations[norm.key]}
              onChange={(e) =>
                update({
                  normalizations: {
                    ...state.normalizations,
                    [norm.key]: e.target.checked,
                  },
                })
              }
              data-testid={norm.testid}
              className="h-4 w-4 rounded border-gray-300"
            />
            {norm.label}
          </label>
        ))}
      </div>

      {parsedA && parsedB ? (
        <div
          className={`rounded-lg border p-3 text-center text-sm font-medium ${
            equal
              ? 'border-green-300 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900/30 dark:text-green-200'
              : 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200'
          }`}
          data-testid="equality-badge"
          role="status"
        >
          {equal ? 'URLs match under current normalizations' : 'URLs differ'}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {(['A', 'B'] as const).map((which) => {
          const parsed = which === 'A' ? parsedA : parsedB;
          const value = which === 'A' ? state.urlA : state.urlB;
          return (
            <div
              key={which}
              className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
              data-testid={`breakdown-${which.toLowerCase()}`}
            >
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  URL {which}
                </h3>
                {parsed ? (
                  <CopyButton
                    value={breakdownText(parsed)}
                    testid={`copy-url-${which.toLowerCase()}`}
                  />
                ) : null}
              </div>
              {parsed ? (
                <dl className="space-y-1 text-xs text-gray-700 dark:text-gray-300">
                  <div className="flex justify-between gap-2">
                    <dt>Protocol</dt>
                    <dd className="font-mono" data-testid={`protocol-${which.toLowerCase()}`}>
                      {parsed.protocol}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>Host</dt>
                    <dd className="font-mono" data-testid={`host-${which.toLowerCase()}`}>
                      {parsed.host}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>Port</dt>
                    <dd className="font-mono">{parsed.port || '(default)'}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>Path</dt>
                    <dd className="font-mono">
                      /{parsed.segments.join('/')}
                      {parsed.segments.length === 0 ? '/' : ''}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>Fragment</dt>
                    <dd className="font-mono">
                      {parsed.fragment ? `#${parsed.fragment}` : '(none)'}
                    </dd>
                  </div>
                </dl>
              ) : (
                <p
                  className="text-xs text-gray-500 dark:text-gray-400"
                  data-testid={`invalid-url-${which.toLowerCase()}`}
                >
                  {value.trim()
                    ? 'Invalid URL — cannot parse.'
                    : 'Enter a URL to see its breakdown.'}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {parsedA && parsedB ? (
        <>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/50">
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Query parameters
            </h3>
            <ul className="space-y-1 text-xs" data-testid="param-list">
              {(parsedA.query.length > 0 || parsedB.query.length > 0) &&
                (() => {
                  const keys = new Set<string>();
                  const firstValues = new Map<string, { a?: string; b?: string }>();
                  for (const p of parsedA.query) {
                    if (!keys.has(p.key)) {
                      keys.add(p.key);
                      firstValues.set(p.key, { a: p.value });
                    }
                  }
                  for (const p of parsedB.query) {
                    const entry = firstValues.get(p.key);
                    if (entry) {
                      if (entry.a === undefined) entry.a = undefined;
                      entry.b = entry.b ?? p.value;
                    } else {
                      keys.add(p.key);
                      firstValues.set(p.key, { b: p.value });
                    }
                  }
                  return Array.from(keys).map((key) => {
                    const label = labels.get(key) ?? 'added';
                    const entry = firstValues.get(key) ?? {};
                    return (
                      <li
                        key={key}
                        className="flex items-center justify-between gap-2 rounded-md border border-gray-200 px-3 py-1.5 dark:border-gray-800"
                      >
                        <span
                          className={`rounded px-1.5 py-0.5 font-medium ${LABEL_BADGE[label]}`}
                          data-testid={`param-label-${key}`}
                        >
                          {label}
                        </span>
                        <span className="font-mono text-gray-700 dark:text-gray-300">
                          {entry.a !== undefined ? `${key}=${entry.a}` : `${key}=${entry.b ?? ''}`}
                        </span>
                      </li>
                    );
                  });
                })()}
            </ul>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-600 dark:text-gray-300">
              <span data-testid="summary-added">{added.length} added</span>
              <span data-testid="summary-removed">{removed.length} removed</span>
              <span data-testid="summary-changed">{changed.length} changed</span>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/50">
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Unified query diff
            </h3>
            <pre
              className="overflow-x-auto font-mono text-xs text-gray-700 dark:text-gray-300"
              data-testid="unified-diff"
            >
              {diffLines.length > 0 ? diffLines.join('\n') : '(query strings identical)'}
            </pre>
            <div className="mt-2 flex flex-wrap gap-2">
              <CopyButton value={parsedA.query.map((p) => `${p.key}=${p.value}`).join('&')} testid="copy-query-a" />
              <span className="self-center text-gray-400">vs</span>
              <CopyButton value={parsedB.query.map((p) => `${p.key}=${p.value}`).join('&')} testid="copy-query-b" />
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/50">
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Query encodings
            </h3>
            <table className="w-full text-xs" data-testid="encoding-table">
              <thead>
                <tr className="text-left text-gray-500 dark:text-gray-400">
                  <th className="py-1">Key</th>
                  <th className="py-1">Decoded</th>
                  <th className="py-1">Encoded</th>
                </tr>
              </thead>
              <tbody>
                {queryValueViews([...parsedA.query, ...parsedB.query]).map((v, i) => (
                  <tr
                    key={`${v.key}-${i}`}
                    className="border-t border-gray-200 dark:border-gray-800"
                  >
                    <td className="py-1 font-mono">{v.key}</td>
                    <td className="py-1 font-mono">{v.decoded}</td>
                    <td className="py-1 font-mono">{v.encoded}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {parsedA && parsedB ? (
        <button
          type="button"
          data-testid="btn-save-history"
          onClick={() => {
            const a = state.urlA.trim();
            const b = state.urlB.trim();
            onSaveHistory?.(`${a} vs ${b} — ${equal ? 'match' : 'differ'}`);
          }}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Save comparison to history
        </button>
      ) : null}

      <div>
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
          History
        </h3>
        {state.history.length === 0 ? (
          <p className="text-xs text-gray-500 dark:text-gray-400" data-testid="history-empty">
            No saved comparisons yet.
          </p>
        ) : (
          <ul className="space-y-1" data-testid="history-list">
            {state.history.map((entry, i) => (
              <li
                key={`${entry.createdAt}-${i}`}
                className="flex items-center justify-between gap-2 rounded-md border border-gray-200 px-3 py-1.5 text-xs dark:border-gray-800"
              >
                <span className="text-gray-700 dark:text-gray-300">{entry.text}</span>
                <CopyButton value={entry.text} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-center text-xs text-gray-500 dark:text-gray-400">
        All comparisons run locally in your browser; nothing is uploaded.
      </p>
    </div>
  );
};
