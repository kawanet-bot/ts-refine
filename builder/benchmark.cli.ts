#!/usr/bin/env node

// Thin .ts entry point for the development benchmark, mirroring src/cli.ts:
// forward argv/stdout/stderr to refineBenchmark, print any thrown error to
// stderr, and exit with the resulting status. The benchmark is a builder-only
// tool (never bundled into dist) that times the report and format passes
// against a real tsconfig project.

import {refineBenchmark} from "./benchmark/refine-benchmark.ts"

refineBenchmark({args: {}, tokens: process.argv.slice(2), output: process.stdout, log: process.stderr})
    .catch((e) => {
        console.error(e instanceof Error ? e.message : String(e))
        return 1
    })
    .then((status) => process.exit(status))
