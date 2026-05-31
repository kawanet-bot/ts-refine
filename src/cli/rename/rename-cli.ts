// `rename` runner: survey the project so the post-rename organizeImports
// follows the codebase's conventions, then rename the exported identifier.

import {initProject, refineRename, refineReport, type TSR} from "../../index.ts"
import {applyReportNames} from "../../report/report-names.ts"
import {type CommandGlobals, resolvePaths} from "../args-common.ts"
import {NULL_SINK} from "../cli-io.ts"
import {parseRename} from "./rename-args.ts"

export async function runRename(sub: string[], globals: CommandGlobals): Promise<number> {
    const args = parseRename(sub, globals)
    if (!args) return 1
    const {absTsconfig, paths} = resolvePaths(args.tsconfigPath, args.paths)
    const project = initProject({tsConfigFilePath: absTsconfig})
    const reportNames = applyReportNames as TSR.ReportName[]
    const report = await refineReport(project, {paths: [], reportNames, stream: NULL_SINK})
    await refineRename(project, {from: args.from, to: args.to, file: paths[0] ?? null, dryRun: args.dryRun, report})
    return 0
}
