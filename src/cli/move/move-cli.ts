// `move` runner: split the flat positional list into sources + destination,
// survey the project so the post-move organizeImports follows the codebase's
// conventions, then relocate.

import {initProject, refineMove, refineReport, type TSR} from "../../index.ts"
import {applyReportNames} from "../../report/report-names.ts"
import type {CommandGlobals} from "../args-common.ts"
import {NULL_SINK} from "../cli-io.ts"
import {parseMove} from "./move-args.ts"

export async function runMove(sub: string[], globals: CommandGlobals): Promise<number> {
    const args = parseMove(sub, globals)
    if (!args) return 1
    const project = initProject({tsConfigFilePath: args.tsconfigPath})
    const sources = args.paths.slice(0, -1)
    const dest = args.paths[args.paths.length - 1]
    const reportNames = applyReportNames as TSR.ReportName[]
    const report = await refineReport(project, {paths: [], reportNames, stream: NULL_SINK})
    await refineMove(project, {sources, dest, dryRun: args.dryRun, report})
    return 0
}
