// Report router. Holds the registry of report names → implementation
// functions, exposes the known names for argument validation, and runs
// the requested subset in registry order. The order here is the order
// reports appear in multi-report output.

import type {Project} from "ts-morph"

import type {Writer} from "../lib/writable.ts"
import {runReportIndent} from "./indent.ts"
import {runReportMemberSeparators} from "./member-separators.ts"
import {runReportSemicolons} from "./semicolons.ts"
import type {ReportOpts} from "../lib/types.ts"
import {runReportUnusedExports} from "./unused-exports.ts"

const REPORTS: Record<string, (project: Project, opts: ReportOpts) => Promise<void>> = {
    "unused-exports": runReportUnusedExports,
    semicolons: runReportSemicolons,
    indent: runReportIndent,
    "member-separators": runReportMemberSeparators,
}

export const reportNames = Object.keys(REPORTS)

export interface RunReportsOpts {
    reportNames: string[]
    stream: Writer
    absIncludes: string[]
    absExcludes: string[]
}

export async function runReports(project: Project, opts: RunReportsOpts): Promise<void> {
    const {stream, reportNames: requested, absIncludes, absExcludes} = opts
    // Validate every requested name up-front so a typo fails before any
    // report runs. The registry is the source of truth for what names exist.
    for (const name of requested) {
        if (!(name in REPORTS)) {
            throw new Error(`unknown report name: ${name} (known: ${reportNames.join(", ")})`)
        }
    }
    for (const name of Object.keys(REPORTS)) {
        if (!requested.includes(name)) continue
        await REPORTS[name](project, {stream, absIncludes, absExcludes})
    }
}
