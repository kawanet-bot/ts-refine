// `format` runner: survey the project for the recommendation, then apply it
// (plus any CLI overrides). The Markdown stream is swallowed; refineFormat
// writes the files.

import {initProject, refineFormat, refineReport, type TSR} from "../../index.ts"
import {applyReportNames} from "../../report/report-names.ts"
import {type CommandGlobals, resolvePaths} from "../args-common.ts"
import {NULL_SINK} from "../cli-io.ts"
import {parseFormat} from "./format-args.ts"

export async function runFormat(sub: string[], globals: CommandGlobals): Promise<number> {
    const args = parseFormat(sub, globals)
    if (!args) return 1
    const {absTsconfig, paths} = resolvePaths(args.tsconfigPath, args.paths)
    const project = initProject({tsConfigFilePath: absTsconfig})
    const reportNames = applyReportNames as TSR.ReportName[]
    const report = await refineReport(project, {paths, reportNames, stream: NULL_SINK})
    await refineFormat(project, {paths, dryRun: args.dryRun, report, ...args.applyOverrides})
    return 0
}
