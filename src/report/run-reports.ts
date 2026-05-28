// Report router. Owns the registry of report names, validates argv-side
// input against it, and runs requested reports in a fixed order. Each
// report function returns the action params its recommendation would
// drive (or an empty partial when nothing strict was found); the router
// merges those into a single TsSurveyReport so a caller can chain them
// into action calls (or format them with --format).

import type {Project} from "ts-morph"

import type {RunIndentOpts} from "../action/indent.ts"
import type {RunMemberSeparatorsOpts} from "../action/member-separators.ts"
import type {RunSemicolonsOpts} from "../action/semicolons.ts"
import type {ReportOpts} from "../lib/types.ts"
import type {Writer} from "../lib/writable.ts"
import {runReportIndent} from "./indent.ts"
import {runReportMemberSeparators} from "./member-separators.ts"
import {runReportSemicolons} from "./semicolons.ts"
import {runReportUnusedExports} from "./unused-exports.ts"

// Fixed run order. Reports that return a recommendation slot also appear
// as keys on the returned TsSurveyReport.
export const reportNames = ["unused-exports", "semicolons", "indent", "member-separators"] as const

export interface RunReportsOpts {
    reportNames: string[]
    stream: Writer
    absIncludes: string[]
    absExcludes: string[]
}

// 各キーは「該当アクションを呼び出すための引数 (の Partial)」。formatter
// 群はこれを起点に `--format prettier` / `--format ts-survey` などへ
// 再構築する。`member-separators` はアクション未実装だが、戻り値の枠だけ
// 先に揃えておく。
export interface TsSurveyReport {
    semicolons?: Partial<RunSemicolonsOpts>
    indent?: Partial<RunIndentOpts>
    memberSeparators?: Partial<RunMemberSeparatorsOpts>
}

export async function runReports(project: Project, opts: RunReportsOpts): Promise<TsSurveyReport> {
    const {stream, reportNames: requested, absIncludes, absExcludes} = opts

    // Validate every requested name up-front so a typo fails before any
    // report runs. `reportNames` is the source of truth for what exists.
    for (const name of requested) {
        if (!(reportNames as readonly string[]).includes(name)) {
            throw new Error(`unknown report name: ${name} (known: ${reportNames.join(", ")})`)
        }
    }

    const report: TsSurveyReport = {}
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
