// Report router. Owns the registry of report names, validates argv-side
// input against it, and runs requested reports in a fixed order. Each
// report function returns the action params its recommendation would
// drive (or an empty partial when nothing strict was found); the router
// merges those into a single TsSurveyReport so a caller can chain them
// into action calls (or format them with --format).

import type * as declared from "@kawanet/ts-survey"

import type {ReportOpts} from "../lib/types.ts"
import {runReportIndent} from "./indent.ts"
import {runReportMemberSeparators} from "./member-separators.ts"
import {runReportSemicolons} from "./semicolons.ts"
import {runReportUnusedExports} from "./unused-exports.ts"

// Fixed run order. Reports that return a recommendation slot also appear
// as keys on the returned TsSurveyReport.
export const reportNames = ["unused-exports", "semicolons", "indent", "member-separators"] as const

export const runReports: typeof declared.runReports = async (project, opts) => {
    const {stream, reportNames: requested, absIncludes, absExcludes} = opts

    // Validate every requested name up-front so a typo fails before any
    // report runs. `reportNames` is the source of truth for what exists.
    for (const name of requested) {
        if (!(reportNames as readonly string[]).includes(name)) {
            throw new Error(`unknown report name: ${name} (known: ${reportNames.join(", ")})`)
        }
    }

    const report: declared.TsSurveyReport = {}
    const reportOpts: ReportOpts = {stream, absIncludes, absExcludes}

    if (requested.includes("unused-exports")) {
        await runReportUnusedExports(project, reportOpts)
    }
    if (requested.includes("semicolons")) {
        report.semicolons = await runReportSemicolons(project, reportOpts)
    }
    if (requested.includes("indent")) {
        report.indent = await runReportIndent(project, reportOpts)
    }
    if (requested.includes("member-separators")) {
        report.memberSeparators = await runReportMemberSeparators(project, reportOpts)
    }

    return report
}
