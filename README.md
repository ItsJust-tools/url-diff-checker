# URL Diff Checker

Compare two URLs and diff their protocol, host, path, and query parameters side by side.

**Live:** [url-diff-checker.itsjust.tools](https://url-diff-checker.itsjust.tools)

## Features

- Side-by-side URL input fields with paste and sample buttons
- Parses each URL into protocol, host, port, path segments, query params, and fragment
- Highlights parameter value changes, added and removed params between the two URLs
- Toggle to ignore query order, trailing slashes, and case of host
- Raw unified diff of query strings as key=value lines
- Copy full breakdown of either URL as text
- URL-encoded and decoded views of every query value
- History of last 10 comparisons stored locally
- Shareable state via URL, `.itsjust.json` import/export and image/PDF export
- 100% client-side — no data ever leaves your browser

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Testing

```bash
npm run lint
npm test
npm run build
```

## License

MIT
