#!/usr/bin/env node

// argv → Project → one report pass, then either runApply (write) or
// Markdown + format finalizer (read). parseArgs ensures the two paths
// never overlap.

import type {TsSurveyReportName} from "@kawanet/ts-survey"

import {selectFormat} from "./format/run-format.ts"
import {initProject, runApply, runReports} from "./index.ts"
import {writePrettierMarkdown} from "./lib/format-prettier.ts"
import {writeTsSurveyMarkdown} from "./lib/format-ts-survey.ts"
import {parseArgs} from "./lib/parse-args.ts"
import {usage} from "./lib/usage.ts"

const opts = parseArgs(process.argv.slice(2))

// parseArgs returns undefined for argv errors (stderr already written),
// {help} for --help, or ParsedArgs for normal dispatch.
if (opts === undefined) {
    console.error(usage())
    process.exit(1)
}
if ("help" in opts) {
    console.log(usage())
    process.exit(0)
}

const fileOpts = {absIncludes: opts.absIncludes, absExcludes: opts.absExcludes}

// Swallow the Markdown stream in apply mode; runApply consumes the report.
const NULL_SINK = {write: () => {}}

// Library throws (missing tsconfig, unknown report name) become clean
// CLI errors rather than unhandled rejections.
try {
    const project = initProject(opts.tsconfigPath)

    const format = opts.apply ? {reportStream: NULL_SINK, finalize: () => {}} : selectFormat(opts.format, process.stdout)

    // Report-name validation lives in runReports so typos surface as a
    // named error there. Cast at the boundary.
    const reportNames = opts.reportNames as TsSurveyReportName[]
    const report = await runReports(project, {...fileOpts, reportNames, stream: format.reportStream})

    if (opts.apply) {
        await runApply(project, {...fileOpts, dryRun: opts.dryRun, report, ...opts.applyOverrides})
    } else {
        // Survey-default appends `## recommendation` + `### .prettierrc`.
        // `--report` / `--format` paths skip both intentionally.
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
