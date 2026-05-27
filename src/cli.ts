#!/usr/bin/env node

// Parses argv, builds a ts-morph Project via initProject(), then dispatches
// to the action and report functions exported by ./index.ts in a fixed
// order (not input order):
//   1. --organize-imports
//   2. --remove-semicolons / --insert-semicolons
// Placing semicolons after organize-imports lets combined runs converge on
// the same final shape regardless of how flags were written.

import {initProject, runOrganizeImports, runReports, runSemicolons} from "./index.ts"
import {parseArgs} from "./lib/parse-args.ts"
import {reportNames} from "./report/run-reports.ts"

const opts = await parseArgs(process.argv.slice(2), {reportNames})

const project = initProject(opts.tsconfigPath)

const fileOpts = {absIncludes: opts.absIncludes, absExcludes: opts.absExcludes}

if (opts.organizeImports) {
    await runOrganizeImports(project, {...fileOpts, dryRun: opts.dryRun})
}
if (opts.removeSemicolons || opts.insertSemicolons) {
    const mode: "remove" | "insert" = opts.removeSemicolons ? "remove" : "insert"
    await runSemicolons(project, {...fileOpts, dryRun: opts.dryRun, mode})
}

if (opts.reportNames.length > 0) {
    await runReports(project, {...fileOpts, reportNames: opts.reportNames, stream: process.stdout})
}
