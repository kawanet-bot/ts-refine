#!/usr/bin/env node

// Thin .ts entry point: forward argv/stdout to refineCLI and exit with the
// status it resolves to.

import {refineCLI} from "./cli/refine-cli.ts"

refineCLI(process.argv.slice(2), process.stdout).then((status) => process.exit(status))
