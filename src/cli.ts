#!/usr/bin/env node

// Parses argv, builds a ts-morph Project, then dispatches to action/* and
// report/* modules in a fixed order.
//
// Action order is fixed in this file (not input order):
//   1. --organize-imports
//   2. --remove-semicolons / --insert-semicolons
// Placing semicolons after organize-imports makes combined runs converge on
// the final shape regardless of how flags were written.

import {Project} from "ts-morph"

import {runOrganizeImports} from "./action/organize-imports.ts"
import {runSemicolons} from "./action/semicolons.ts"
import {parseArgs} from "./lib/parse-args.ts"
import type {Writer} from "./lib/writable.ts"
import {runReportSemicolons} from "./report/semicolons.ts"
import {runReportUnusedExports} from "./report/unused-exports.ts"

// Report registry. The key order here is the execution order when multiple
// reports are requested. Adding a new report only needs an entry here.
const REPORTS: Record<string, (project: Project, stream: Writer, opts: {absIncludes: string[]; absExcludes: string[]}) => Promise<void>> = {
    "unused-exports": runReportUnusedExports,
    semicolons: runReportSemicolons,
}

const opts = await parseArgs(process.argv.slice(2), {reportNames: Object.keys(REPORTS)})

const project = new Project({tsConfigFilePath: opts.tsconfigPath})

const fileOpts = {absIncludes: opts.absIncludes, absExcludes: opts.absExcludes}

if (opts.organizeImports) {
    await runOrganizeImports(project, {...fileOpts, dryRun: opts.dryRun})
}
if (opts.removeSemicolons || opts.insertSemicolons) {
    const mode: "remove" | "insert" = opts.removeSemicolons ? "remove" : "insert"
    await runSemicolons(project, {...fileOpts, dryRun: opts.dryRun, mode})
}

if (opts.reportNames.length > 0) {
    for (const name of Object.keys(REPORTS)) {
        if (!opts.reportNames.includes(name)) continue
        await REPORTS[name](project, process.stdout, fileOpts)
    }
}
