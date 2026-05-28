#!/usr/bin/env node

// Parses argv, builds a ts-morph Project via initProject(), then always
// runs the report pass once. From there the flow forks:
//
//   - fix mode (--fix or any per-field override): pass the report into
//     runFix and write the changed files; the Markdown body is suppressed.
//   - report mode (the default, --report, or --format): emit the per-
//     report Markdown to the configured stream and let the optional
//     format finalizer (prettier / ts-survey) decide what else to write.
//
// parseArgs guarantees that fix mode and report mode never overlap.

import type {TsSurveyReportName} from "@kawanet/ts-survey"

import {selectFormat} from "./format/run-format.ts"
import {initProject, runFix, runReports} from "./index.ts"
import {writePrettierMarkdown} from "./lib/format-prettier.ts"
import {writeTsSurveyMarkdown} from "./lib/format-ts-survey.ts"
import {parseArgs} from "./lib/parse-args.ts"
import {usage} from "./lib/usage.ts"

const opts = parseArgs(process.argv.slice(2))

// parseArgs encodes its outcome in the return value instead of exiting:
//   - undefined        — error path; a specific message has already been
//                        written to stderr. Append usage and exit 1.
//   - {help: true}     — --help / -h. Usage to stdout and exit 0.
//   - ParsedArgs       — normal dispatch.
if (opts === undefined) {
    console.error(usage())
    process.exit(1)
}
if ("help" in opts) {
    console.log(usage())
    process.exit(0)
}

const fileOpts = {absIncludes: opts.absIncludes, absExcludes: opts.absExcludes}

// Sink used in fix mode to swallow the per-report Markdown stream. The
// recommendation is consumed by runFix instead.
const NULL_SINK = {write: () => {}}

// Library-side throws (missing tsconfig from initProject, unknown report
// name from runReports, ...) surface as a clean CLI error rather than as
// an unhandled-rejection stack.
try {
    const project = initProject(opts.tsconfigPath)

    // The format dispatcher decides what stream the per-report Markdown
    // goes to. In fix mode the report's recommendation drives runFix, so
    // we suppress the Markdown body even when --format is absent by
    // swapping in a null sink.
    const format = opts.fix ? {reportStream: NULL_SINK, finalize: () => {}} : selectFormat(opts.format, process.stdout)

    // parseArgs intentionally keeps reportNames as a `string[]` so a typo
    // reaches runReports and surfaces the actionable "unknown report name"
    // error there rather than at the parse boundary. Cast at the call site.
    const reportNames = opts.reportNames as TsSurveyReportName[]
    const report = await runReports(project, {...fileOpts, reportNames, stream: format.reportStream})

    if (opts.fix) {
        // Fix mode: apply the recommendation (with any per-field overrides)
        // and stop. Markdown body and finalizer were both suppressed above.
        await runFix(project, {...fileOpts, dryRun: opts.dryRun, report, ...opts.fixOverrides})
    } else {
        // Survey-default mode appends two recommendation blocks under the
        // per-report tables: `## recommendation` (the runnable ts-survey
        // command) followed by `### .prettierrc` (the JSON form). Skipping
        // these for the other paths is intentional — `--report` callers
        // asked for specific sections, and `--format` already suppresses
        // the Markdown body entirely.
        if (opts.surveyDefault) {
            writeTsSurveyMarkdown(report, process.stdout)
            writePrettierMarkdown(report, process.stdout)
        }
        format.finalize(report)
    }
} catch (e) {
    console.error(e instanceof Error ? e.message : String(e))
    process.exit(1)
}
