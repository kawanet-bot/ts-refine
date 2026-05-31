// `format` runner: survey the project for the recommendation, then apply it
// (plus any CLI overrides). The Markdown stream is swallowed; refineFormat
// writes the files.

import {initProject, refineFormat, refineReport} from "../../index.ts"
import {reportNamesForFormat} from "../../recommend/format-options.ts"
import {NULL_SINK} from "../cli-io.ts"
import type {CommonArgs} from "../parse-common-args.ts"
import {resolvePaths} from "../resolve-paths.ts"
import {parseFormatArgs} from "./parse-format-args.ts"

export async function runFormat(sub: string[], common: CommonArgs): Promise<number> {
    const args = parseFormatArgs(sub, common)
    if (!args) return 1
    if (common.help) throw new Error("--help is not supported for the format command")
    const {absTsconfig, paths} = resolvePaths(common.tsconfigPath, args.paths)
    const project = initProject({tsConfigFilePath: absTsconfig})
    // Skip surveying any field the CLI already pinned; a fully-pinned run
    // makes this an empty set and refineReport does no work.
    const reportNames = reportNamesForFormat(args.applyOverrides)
    const report = await refineReport(project, {paths, reportNames, stream: NULL_SINK})
    // `--check` reports without writing, so it forces dry-run; the per-file
    // list and summary are already on stderr, so only the fix hint is added.
    const dryRun = common.dryRun || args.check
    const result = await refineFormat(project, {paths, dryRun, report, ...args.applyOverrides})
    if (args.check && result.touched.length > 0) {
        console.error("Run `ts-refine format` to fix.")
        return 1
    }
    return 0
}
