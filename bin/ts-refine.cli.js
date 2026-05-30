#!/usr/bin/env node

// Built-.mjs entry point: the same one-liner as src/cli.ts, but it imports
// the published bundle (dist/ts-refine.mjs, resolved via the package name)
// so it runs without TypeScript type-stripping — usable on Node versions
// below the engines floor.

import {refineCLI} from "ts-refine"

refineCLI(process.argv.slice(2), process.stdout).then((status) => process.exit(status))
