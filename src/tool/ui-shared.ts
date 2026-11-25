import type { Normalizations, ParamChange, QueryParam } from './types';

export interface ParsedUrl {
  protocol: string;
  host: string;
  port: string;
  segments: string[];
  query: QueryParam[];
  fragment: string;
  raw: string;
  /** True when the path ends with a trailing slash (or is empty root '/'). */
  trailingSlash: boolean;
}

export interface QueryValueView {
  key: string;
  encoded: string;
  decoded: string;
}

/** Parse a URL into its structural parts; returns null for empty/invalid input. */
export function parseUrl(input: string): ParsedUrl | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    // preserve original host case from the input (WHATWG URL lowercases it)
    const authorityMatch = /^\w+:\/\/([^/?#]*)/.exec(trimmed);
    const authority = authorityMatch?.[1] ?? '';
    const at = authority.indexOf('@');
    const hostPortRaw = at >= 0 ? authority.slice(at + 1) : authority;
    const colonIdx = hostPortRaw.indexOf(':');
    const hostRaw = colonIdx >= 0 ? hostPortRaw.slice(0, colonIdx) : hostPortRaw;
    const params: QueryParam[] = [];
    url.searchParams.forEach((value, key) => {
      params.push({ key, value });
    });
    return {
      protocol: url.protocol.replace(/:$/, ''),
      host: hostRaw || url.hostname,
      port: url.port || (colonIdx >= 0 ? hostPortRaw.slice(colonIdx + 1) : ''),
      segments: url.pathname.split('/').filter((s) => s.length > 0),
      query: params,
      fragment: url.hash.replace(/^#/, ''),
      raw: trimmed,
      trailingSlash: url.pathname.length > 1 && url.pathname.endsWith('/'),
    };
  } catch {
    return null;
  }
}

/** Parse a raw query string (with optional leading ?) into ordered params. */
export function parseQuery(raw: string): QueryParam[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  const search = trimmed.startsWith('?') ? trimmed.slice(1) : trimmed;
  const params: QueryParam[] = [];
  for (const pair of search.split('&')) {
    if (!pair) continue;
    const eq = pair.indexOf('=');
    if (eq === -1) {
      params.push({ key: pair, value: '' });
    } else {
      const key = pair.slice(0, eq);
      const value = pair.slice(eq + 1);
      let decodedKey = key;
      let decodedValue = value;
      try {
        decodedKey = decodeURIComponent(key);
      } catch {
        // keep raw key when malformed escape
      }
      try {
        decodedValue = decodeURIComponent(value);
      } catch {
        // keep raw value when malformed escape
      }
      params.push({ key: decodedKey, value: decodedValue });
    }
  }
  return params;
}

/** Serialize params back into a raw query string. */
export function formatQuery(params: QueryParam[]): string {
  return params
    .map((p) => {
      const key = encodeURIComponent(p.key);
      return p.value === '' ? key : `${key}=${encodeURIComponent(p.value)}`;
    })
    .join('&');
}

/** Query params that exist only in `a` (by key, first occurrence wins). */
export function removedParams(a: QueryParam[], b: QueryParam[]): QueryParam[] {
  const bKeys = new Set(b.map((p) => p.key));
  const seen = new Set<string>();
  return a.filter((p) => {
    if (bKeys.has(p.key) || seen.has(p.key)) return false;
    seen.add(p.key);
    return true;
  });
}

/** Query params that exist only in `b` (by key, first occurrence wins). */
export function addedParams(a: QueryParam[], b: QueryParam[]): QueryParam[] {
  const aKeys = new Set(a.map((p) => p.key));
  const seen = new Set<string>();
  return b.filter((p) => {
    if (aKeys.has(p.key) || seen.has(p.key)) return false;
    seen.add(p.key);
    return true;
  });
}

/** Params present in both with a different value (matched by first occurrence per key). */
export function changedParams(
  a: QueryParam[],
  b: QueryParam[]
): { key: string; from: string; to: string }[] {
  const bMap = new Map<string, string>();
  for (const p of b) {
    if (!bMap.has(p.key)) bMap.set(p.key, p.value);
  }
  const seen = new Set<string>();
  const out: { key: string; from: string; to: string }[] = [];
  for (const p of a) {
    if (seen.has(p.key)) continue;
    seen.add(p.key);
    const other = bMap.get(p.key);
    if (other === undefined) continue;
    if (p.value !== other) out.push({ key: p.key, from: p.value, to: other });
  }
  return out;
}

/** Label each key of the left query with how it changed. */
export function paramLabels(a: QueryParam[], b: QueryParam[]): Map<string, ParamChange> {
  const bMap = new Map<string, string>();
  for (const p of b) {
    if (!bMap.has(p.key)) bMap.set(p.key, p.value);
  }
  const labels = new Map<string, ParamChange>();
  for (const p of a) {
    if (labels.has(p.key)) continue;
    const other = bMap.get(p.key);
    if (other === undefined) {
      labels.set(p.key, 'removed');
    } else if (p.value !== other) {
      labels.set(p.key, 'changed');
    } else {
      labels.set(p.key, 'same');
    }
  }
  const aKeys = new Set(a.map((p) => p.key));
  for (const p of b) {
    if (!aKeys.has(p.key) && !labels.has(p.key)) labels.set(p.key, 'added');
  }
  return labels;
}

/** Apply normalization-driven comparison; order-insensitive when requested. */
export function queryEqual(a: QueryParam[], b: QueryParam[], opts: Normalizations): boolean {
  const canonical = (params: QueryParam[]) => {
    const copy = params.map((p) => ({ key: p.key, value: p.value }));
    if (opts.ignoreQueryOrder) {
      return JSON.stringify(
        copy
          .map((p) => [p.key, p.value] as [string, string])
          .sort((x, y) => x[0].localeCompare(y[0]))
      );
    }
    return JSON.stringify(copy);
  };
  return canonical(a) === canonical(b);
}

/** Unified diff of the query strings as key=value lines. */
export function unifiedQueryDiff(a: QueryParam[], b: QueryParam[]): string[] {
  const lines: string[] = [];
  const bMap = new Map<string, string>();
  for (const p of b) {
    if (!bMap.has(p.key)) bMap.set(p.key, p.value);
  }
  const seenB = new Set<string>();
  for (const p of a) {
    const other = bMap.get(p.key);
    if (other === undefined) {
      lines.push(`- ${p.key}=${p.value}`);
    } else {
      seenB.add(p.key);
      if (p.value !== other) {
        lines.push(`- ${p.key}=${p.value}`);
        lines.push(`+ ${p.key}=${other}`);
      } else {
        lines.push(`  ${p.key}=${p.value}`);
      }
    }
  }
  for (const p of b) {
    if (seenB.has(p.key)) continue;
    seenB.add(p.key);
    lines.push(`+ ${p.key}=${p.value}`);
  }
  return lines;
}

/** Full text breakdown of one parsed URL for copy actions. */
export function breakdownText(parsed: ParsedUrl): string {
  const lines = [
    `Protocol: ${parsed.protocol}`,
    `Host: ${parsed.host}`,
    `Port: ${parsed.port || '(default)'}`,
    `Path: /${parsed.segments.join('/')}${parsed.segments.length === 0 ? '/' : ''}`,
    `Fragment: ${parsed.fragment ? `#${parsed.fragment}` : '(none)'}`,
    'Query:',
  ];
  for (const p of parsed.query) {
    lines.push(`  ${p.key} = ${p.value}`);
  }
  return lines.join('\n');
}

/** Encoded and decoded views for every query value. */
export function queryValueViews(params: QueryParam[]): QueryValueView[] {
  return params.map((p) => ({
    key: p.key,
    encoded: p.value.replace(/[^A-Za-z0-9!*'(),._~-]/g, (c) =>
      Array.from(new TextEncoder().encode(c))
        .map((b) => `%${b.toString(16).toUpperCase().padStart(2, '0')}`)
        .join('')
    ),
    decoded: p.value,
  }));
}

/**
 * True when the two URLs are equal under the active normalizations:
 * protocol, normalized host, path (with optional trailing-slash folding),
 * and query params (with optional order folding) are compared; fragments are ignored.
 */
export function urlsEqual(a: ParsedUrl, b: ParsedUrl, opts: Normalizations): boolean {
  if (a.protocol !== b.protocol) return false;
  const hostA = opts.ignoreHostCase ? a.host.toLowerCase() : a.host;
  const hostB = opts.ignoreHostCase ? b.host.toLowerCase() : b.host;
  if (hostA !== hostB) return false;
  const segsA = a.segments;
  const segsB = b.segments;
  let foldA = a.trailingSlash;
  let foldB = b.trailingSlash;
  if (opts.ignoreTrailingSlash) {
    foldA = false;
    foldB = false;
  }
  if (segsA.length !== segsB.length) return false;
  if (segsA.some((s, i) => s !== segsB[i])) return false;
  if (!queryEqual(a.query, b.query, opts)) return false;
  if (foldA !== foldB) return false;
  return true;
}
