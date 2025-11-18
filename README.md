# git-bar

Terminal-friendly daily git activity bars grouped by **date and author**, with per-author colors.

## Features
- Groups commits by day **and** author; picks the longest message of the day per author as the label.
- Per-author stable colors applied to the author column and the bar.
- Respects terminal width dynamically; bars never overflow.
- Optional filters: multiple `--author` (OR, case-insensitive) and `--days N`.
- Shows per-day totals (`insertions+,deletions-`).

## Install
Because the npm name appears free, you can publish under `git-bar` (or choose another). For local use:
```bash
npm install -g git-bar  # after publishing (package name is free as of now)
```
Or run directly from the repo after build:
```bash
npm install
npm run build
node dist/git-bar.js --days 7
```

## Usage
```bash
git-bar [--author kw] [--author kw2] [--days N]
```
- `--author <kw>`: filter by author substring; repeatable; OR logic; case-insensitive.
- `--days <N>`: only commits from the last N days; disables the `-n` limit.
- Env `GIT_BAR_LIMIT`: max commits fetched **when `--days` is not used** (default 30).

Columns: `date  hash  author  message(10)  █████  insertions+,deletions-`

## Color control
Colors are enabled when stdout is a TTY. Pipe to another command to disable colors automatically.

## Develop
```bash
npm install
npm run build
npm run check   # type check only
npm run dev     # quick run using node --experimental-strip-types
```

## Publish steps
1. Choose a free name (e.g., `git-bar` is currently unclaimed):
   ```bash
   npm view git-bar dist-tags  # should return 404 if free
   ```
2. Build: `npm run build`
3. (Optional) smoke test: `node dist/git-bar.js --days 3`
4. Publish: `npm publish --access public`

## License
MIT
