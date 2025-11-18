# git-bar

Colorful terminal bars that show daily Git changes per author at a glance.

```bash
npx git-bar --days 7
```

![git-bar CLI screenshot](Screenshot.png)

## Install & run
Prefer no-install? Use `npx`:
```bash
npx git-bar --days 7
```

or install with npm/pnpm
```bash
npm install -g git-bar   # once published on npm
```

## Command & options
```bash
git-bar [--author keyword] [--author keyword2] [--days N]
```
- `--author <keyword>`: filter authors by substring; repeatable; OR logic; case-insensitive.
- `--days <N>`: show only the last N days; overrides the default fetch limit.
- Env `GIT_BAR_LIMIT`: max commits fetched when `--days` is not set (default 30).

## Colors
Colors stay on when stdout is a TTY. They switch off automatically when piped to another command or file.

## Findability
Keywords people search for: git calendar, git stats, git activity graph, git contributions chart, git commits per day, git author stats terminal.

## License
MIT
