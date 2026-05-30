# ts-refine

Zero-config TypeScript refactoring that follows your codebase's **own**
conventions. `ts-refine` surveys how your project already writes code —
indentation, semicolons, import extensions, line endings — and then performs
structural edits (move files, organize imports, format) that match what it
finds. No `.prettierrc`, no rule config: the codebase is the spec.

It is built on the TypeScript Language Service (via
[ts-morph](https://github.com/dsherret/ts-morph)), so import rewriting and
formatting use the same engine your editor does. The design goal is safe,
low-friction cleanup after code changes — handy for both humans and AI
coding agents.

## Why not just Prettier?

Style unification is Prettier's job, and `ts-refine` does not try to replace
it. The value here is the **refactoring** operations that need to understand
your code as a graph — moving a file and rewriting every importer, organizing
imports the way your project already does — done with zero configuration. The
formatter exists mainly so those edits blend into the surrounding file rather
than fighting it.

## Install

Requires Node.js >= 22.18.

```sh
npx ts-refine <command> [options] [files...]
```

## Commands

| Command   | Mode  | What it does                                                     |
| --------- | ----- | --------------------------------------------------------------- |
| `report`  | read  | Survey the codebase and print Markdown reports + recommendations |
| `format`  | write | Apply the recommended style to disk and organize imports         |
| `list`    | read  | List files with export / unused / importer counts                |
| `inspect` | read  | Per-file analysis (exports, importers)                           |
| `move`    | write | Move `.ts` files and rewrite every import that references them    |

Global options may appear on either side of the command:

- `-p, --project <path>` — path to a `tsconfig.json` or a directory containing
  one (defaults to `-p .`).
- `--dry-run` — for `format` / `move`, print what would change instead of
  writing.
- `-h, --help` — show usage.

## Examples

```sh
# See how the codebase is styled, with recommendations
npx ts-refine report -p ./tsconfig.json

# Emit a runnable command, or a Prettier config, from the survey
npx ts-refine report --output ts-refine
npx ts-refine report --output prettier

# Format every file to the detected conventions and organize imports
npx ts-refine format

# Preview only
npx ts-refine format --dry-run

# Move a file; all importers are rewritten automatically
npx ts-refine move src/old/util.ts src/lib/util.ts
```

`format` accepts per-field overrides when you want to pin a setting instead of
following the survey: `--indent <N|tab>`, `--semicolons on|off`,
`--new-line lf|crlf`, `--bracket-spacing on|off`, `--organize-imports on|off`.

## Status

Work in progress; the command surface is still settling and may change.

## License

MIT
