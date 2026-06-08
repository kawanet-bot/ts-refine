# Source Layout

This directory contains the TypeScript sources that are bundled into the
published library and CLI.

## Entry Points

- `src/index.ts` exports the public library API described by
  `types/ts-refine.d.ts`; it is bundled into `dist/ts-refine.mjs`.
- `src/cli.ts` is the executable entry point for the `ts-refine` command; it is
  bundled into `dist/ts-refine.cli.mjs`.

## Directories

- `src/cli/` contains command-line adapters for the public CLI.
- `src/common/` contains code shared by the CLI layer and public API
  implementations.
- `src/lib/` contains internal helpers shared by the public API implementations.
- `src/test-utils/` contains shared test helpers.
- `src/{subcommand}/` directories, such as `src/report/` and `src/format/`,
  contain reusable implementation for command-sized features; matching
  `src/cli/{subcommand}/` directories adapt them to the CLI.
