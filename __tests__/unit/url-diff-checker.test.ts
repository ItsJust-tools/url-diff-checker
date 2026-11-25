import { describe, it, expect } from 'vitest';
import {
  addedParams,
  breakdownText,
  changedParams,
  formatQuery,
  paramLabels,
  parseQuery,
  parseUrl,
  queryEqual,
  queryValueViews,
  removedParams,
  unifiedQueryDiff,
  urlsEqual,
} from '@/tool/ui-shared';
import { serializeState, deserializeState, withHistory, roundTrips } from '@/tool/tool-definition';
import { DEFAULT_STATE, MAX_HISTORY, type ToolState } from '@/tool/types';
import { urlDiffCheckerTool } from '@/tool/tool-definition';

const state = (patch: Partial<ToolState> = {}): ToolState => ({
  ...DEFAULT_STATE,
  normalizations: { ...DEFAULT_STATE.normalizations },
  ...patch,
});

const norm = (patch: Partial<ToolState['normalizations']> = {}) => ({
  ...DEFAULT_STATE.normalizations,
  ...patch,
});

describe('parseUrl', () => {
  it('parses all structural parts', () => {
    const parsed = parseUrl('https://example.com:8443/a/b/c?x=1&y=2#frag');
    expect(parsed).not.toBeNull();
    expect(parsed!.protocol).toBe('https');
    expect(parsed!.host).toBe('example.com');
    expect(parsed!.port).toBe('8443');
    expect(parsed!.segments).toEqual(['a', 'b', 'c']);
    expect(parsed!.query).toEqual([
      { key: 'x', value: '1' },
      { key: 'y', value: '2' },
    ]);
    expect(parsed!.fragment).toBe('frag');
  });

  it('returns null for empty or whitespace input', () => {
    expect(parseUrl('')).toBeNull();
    expect(parseUrl('   ')).toBeNull();
  });

  it('returns null for invalid URLs without crashing', () => {
    expect(parseUrl('not a url')).toBeNull();
    expect(parseUrl('http://')).toBeNull();
    expect(parseUrl('://broken')).toBeNull();
  });

  it('detects trailing slash', () => {
    expect(parseUrl('https://example.com/path/')!.trailingSlash).toBe(true);
    expect(parseUrl('https://example.com/path')!.trailingSlash).toBe(false);
    expect(parseUrl('https://example.com/')!.trailingSlash).toBe(false);
  });
});

describe('parseQuery / formatQuery', () => {
  it('round-trips key=value pairs', () => {
    const params = parseQuery('?a=1&b=two&c');
    expect(params).toEqual([
      { key: 'a', value: '1' },
      { key: 'b', value: 'two' },
      { key: 'c', value: '' },
    ]);
    expect(formatQuery(params)).toBe('a=1&b=two&c');
  });

  it('handles empty raw query', () => {
    expect(parseQuery('')).toEqual([]);
    expect(parseQuery('?')).toEqual([]);
  });

  it('decodes percent-encoded values and survives malformed escapes', () => {
    expect(parseQuery('q=%20hello%21')).toEqual([{ key: 'q', value: ' hello!' }]);
    expect(parseQuery('q=%zz')).toEqual([{ key: 'q', value: '%zz' }]);
  });
});

describe('param diffing', () => {
  const a = parseQuery('a=1&b=old&c=3');
  const b = parseQuery('b=new&c=3&d=4');

  it('labels added, removed, changed and same params', () => {
    const labels = paramLabels(a, b);
    expect(labels.get('a')).toBe('removed');
    expect(labels.get('b')).toBe('changed');
    expect(labels.get('c')).toBe('same');
    expect(labels.get('d')).toBe('added');
  });

  it('classifies added, removed and changed params', () => {
    expect(addedParams(a, b)).toEqual([{ key: 'd', value: '4' }]);
    // key c exists in both with same value: not removed either
    expect(
      removedParams(
        a,
        b.filter((p) => p.key !== 'c')
      )
    ).toEqual([
      { key: 'a', value: '1' },
      { key: 'c', value: '3' },
    ]);
    // key b exists in both but with different value: not removed, it changed
    expect(removedParams(b, a)).toEqual([{ key: 'd', value: '4' }]);
    // only d is genuinely added; b changed value, a is missing from b
    expect(addedParams(b, a)).toEqual([{ key: 'a', value: '1' }]);
    expect(changedParams(a, b)).toEqual([{ key: 'b', from: 'old', to: 'new' }]);
  });

  it('uses first occurrence for duplicate keys', () => {
    const dupA = parseQuery('x=1&x=2');
    const dupB = parseQuery('x=1');
    expect(changedParams(dupA, dupB)).toEqual([]);
    expect(paramLabels(dupA, dupB).get('x')).toBe('same');
  });
});

describe('queryEqual with normalizations', () => {
  it('order matters unless ignoreQueryOrder is set', () => {
    const a = parseQuery('a=1&b=2');
    const b = parseQuery('b=2&a=1');
    expect(queryEqual(a, b, norm())).toBe(false);
    expect(queryEqual(a, b, norm({ ignoreQueryOrder: true }))).toBe(true);
  });

  it('a duplicate key with different order is not equal even when order is ignored', () => {
    const a = parseQuery('a=1&a=2');
    const b = parseQuery('a=2&a=1');
    expect(queryEqual(a, b, norm({ ignoreQueryOrder: true }))).toBe(false);
  });
});

describe('urlsEqual normalizations', () => {
  const base = parseUrl('https://Example.com/path?a=1')!;

  it('host case only ignored when toggled', () => {
    // URL parsing preserves host case, so only ignoreHostCase folds it
    const parsedUpper = parseUrl('https://Example.CoM/path?a=1')!;
    const parsedLower = parseUrl('https://example.com/path?a=1')!;
    expect(parsedUpper.host).toBe('Example.CoM');
    expect(urlsEqual(parsedUpper, parsedLower, norm())).toBe(false);
    expect(urlsEqual(parsedUpper, parsedLower, norm({ ignoreHostCase: true }))).toBe(true);
  });

  it('trailing slash only ignored when toggled', () => {
    const withSlash = parseUrl('https://example.com/path/?a=1')!;
    const without = parseUrl('https://example.com/path?a=1')!;
    expect(urlsEqual(without, withSlash, norm())).toBe(false);
    expect(urlsEqual(without, withSlash, norm({ ignoreTrailingSlash: true }))).toBe(true);
  });

  it('protocol and query differences still differ under all normalizations', () => {
    const http = parseUrl('http://example.com/path?a=1')!;
    const diffQuery = parseUrl('https://Example.com/path?a=2')!;
    expect(urlsEqual(base, http, norm({ ignoreHostCase: true }))).toBe(false);
    expect(urlsEqual(base, diffQuery, norm({ ignoreHostCase: true, ignoreQueryOrder: true }))).toBe(
      false
    );
    // same query in different order is equal when order ignored
    const reordered = parseUrl('https://Example.com/path/?a=1&x=0&b=2')!;
    const original = parseUrl('https://Example.com/path/?b=2&x=0&a=1')!;
    expect(
      urlsEqual(original, reordered, norm({ ignoreQueryOrder: true, ignoreTrailingSlash: true }))
    ).toBe(true);
  });
});

describe('unified diff', () => {
  it('produces -, + and same lines', () => {
    const a = parseQuery('a=1&b=old');
    const b = parseQuery('b=new&c=3');
    const lines = unifiedQueryDiff(a, b);
    expect(lines).toContain('- a=1');
    expect(lines).toContain('- b=old');
    expect(lines).toContain('+ b=new');
    expect(lines).toContain('+ c=3');
    expect(lines.some((l) => l.startsWith('  '))).toBe(false);
  });

  it('keeps unchanged lines with leading spaces', () => {
    const lines = unifiedQueryDiff(parseQuery('a=1'), parseQuery('a=1'));
    expect(lines).toEqual(['  a=1']);
  });
});

describe('queryValueViews', () => {
  it('reports encoded and decoded values', () => {
    const views = queryValueViews(parseQuery('q=%20hello&plain=a b'));
    expect(views).toEqual([
      { key: 'q', encoded: '%20hello', decoded: ' hello' },
      { key: 'plain', encoded: 'a%20b', decoded: 'a b' },
    ]);
  });
});

describe('breakdownText', () => {
  it('includes all parts', () => {
    const parsed = parseUrl('https://example.com:8443/a/b?x=1#f')!;
    const text = breakdownText(parsed);
    expect(text).toContain('Protocol: https');
    expect(text).toContain('Host: example.com');
    expect(text).toContain('Port: 8443');
    expect(text).toContain('Path: /a/b');
    expect(text).toContain('Fragment: #f');
    expect(text).toContain('x = 1');
  });
});

describe('deserialize/serialize round-trips', () => {
  it('round-trips a full state', () => {
    const full = withHistory(state({ urlA: 'https://a.dev', urlB: 'https://b.dev' }), 'cmp one');
    expect(roundTrips(full)).toBe(true);
  });

  it('restores both URL fields and normalizations', () => {
    const original = state({
      urlA: 'https://one.example',
      urlB: 'https://two.example',
      normalizations: norm({ ignoreQueryOrder: true, ignoreTrailingSlash: true }),
    });
    const restored = deserializeState(JSON.parse(serializeState(original)));
    expect(restored.success).toBe(true);
    expect((restored as { data: ToolState }).data!.urlA).toBe('https://one.example');
    expect((restored as { data: ToolState }).data!.urlB).toBe('https://two.example');
    expect((restored as { data: ToolState }).data!.normalizations).toEqual(original.normalizations);
  });

  it('rejects non-object payloads and recovers garbage types', () => {
    expect(deserializeState('nope').success).toBe(false);
    expect(deserializeState(null).success).toBe(false);
    expect(deserializeState([1, 2]).success).toBe(false);
    const garbage = deserializeState({ urlA: 42, normalizations: 'bad', history: 'bad' });
    expect(garbage.success).toBe(true);
    expect((garbage as { data: ToolState }).data!.urlA).toBe('');
    expect((garbage as { data: ToolState }).data!.normalizations).toEqual(
      DEFAULT_STATE.normalizations
    );
    expect((garbage as { data: ToolState }).data!.history).toEqual([]);
  });

  it('caps history at MAX_HISTORY (10)', () => {
    let s = state();
    for (let i = 0; i < MAX_HISTORY + 5; i++) {
      s = withHistory(s, `entry ${i}`);
    }
    expect(s.history.length).toBe(MAX_HISTORY);
    const restored = deserializeState(JSON.parse(serializeState(s)));
    expect((restored as { data: ToolState }).data!.history.length).toBe(MAX_HISTORY);
    // drops non-conforming entries
    const bad = deserializeState({
      history: [{ text: 'ok', createdAt: '2026-01-01T00:00:00Z' }, { text: 5 }, null, 'nope'],
    });
    expect((bad as { data: ToolState }).data!.history.length).toBe(1);
  });
});

describe('tool definition', () => {
  it('exposes the correct id and initial state', () => {
    expect(urlDiffCheckerTool.id).toBe('url-diff-checker');
    expect(urlDiffCheckerTool.initialState).toEqual(DEFAULT_STATE);
  });

  it('defaults normalizations to all false for garbage input', () => {
    const result = deserializeState({ normalizations: { ignoreHostCase: 'yes' } });
    expect((result as { data: ToolState }).data!.normalizations.ignoreHostCase).toBe(false);
    expect((result as { data: ToolState }).data!.normalizations.ignoreQueryOrder).toBe(false);
  });
});
