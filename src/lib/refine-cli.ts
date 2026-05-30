// refineCLI is the whole CLI as a function: parse argv, dispatch the
// subcommand, write stdout-bound output to `stream`, and resolve with the
// process exit status. It never calls process.exit and never rejects, so the
// thin entry points (src/cli.ts for .ts, bin/ts-refine.cli.js for the built
// .mjs) just forward argv/stdout and exit with the returned status.
//
// `stream` stands in for stdout (the report Markdown, list/inspect tables,
// usage, --output bodies). Diagnostics and per-command progress stay on
// console.error / the runners' own console output, which already target the
// process's stderr/stdout.

import type * as declared from "ts-refine"
import type {InspectorName, TsRefineReportName} from "ts-refine"

import {refineFormat} from "../format/refine-format.ts"
import {writeInspectFile} from "../inspect/format-inspect.ts"
import {refineInspect} from "../inspect/refine-inspect.ts"
import {filterListEntries, writeListTable} from "../list/format-list.ts"
import {refineList} from "../list/refine-list.ts"
import {refineMove} from "../move/refine-move.ts"
import {writePrettierMarkdown} from "../recommend/output-prettier.ts"
import {writeFormatMarkdown} from "../recommend/output-ts-refine.ts"
import {selectOutput} from "../recommend/select-output.ts"
import {refineRename} from "../rename/refine-rename.ts"
import {refineReport} from "../report/refine-report.ts"
import {initProject} from "./init-project.ts"
import {parseArgs} from "./parse-args.ts"
import {usage} from "./usage.ts"

export const refineCLI: typeof declared.refineCLI = async (args, stream) => {
    const opts = parseArgs(args)

    // parseArgs returns undefined for argv errors (stderr already written),
    // {help} for the help command, or ParsedArgs for normal dispatch.
    if (opts === undefined) {
        console.error(usage())
        return 1
    }
    if ("help" in opts) {
        stream.write(usage() + "\n")
        return 0
    }

    const fileOpts = {paths: opts.paths}
    // Swallow the Markdown stream in the write modes; the runner consumes it.
    const NULL_SINK = {write: () => {}}
    // Report-name validation lives in refineReport so typos surface there.
    const reportNames = opts.reportNames as TsRefineReportName[]

    // Library throws (missing tsconfig, unknown report name) become a clean
    // non-zero status rather than an unhandled rejection.
    try {
        const project = initProject(opts.tsconfigPath)

        if (opts.command === "list") {
            const entries = await refineList(project, fileOpts)
            writeListTable(filterListEntries(entries, opts.listFilters!), stream)
        } else if (opts.command === "inspect") {
            const inspectorNames = opts.inspectorNames! as InspectorName[]
            const files = await refineInspect(project, {...fileOpts, inspectorNames})
            for (const file of files) writeInspectFile(file, stream)
        } else if (opts.command === "move") {
            // Move's positionals arrive flat; split the destination (last)
            // from the sources (rest). Survey the whole project first so the
            // post-move organizeImports follows the codebase's conventions.
            const sources = opts.paths.slice(0, -1)
            const dest = opts.paths[opts.paths.length - 1]
            const report = await refineReport(project, {paths: [], reportNames, stream: NULL_SINK})
            await refineMove(project, {sources, dest, dryRun: opts.dryRun, report})
        } else if (opts.command === "rename") {
            const report = await refineReport(project, {paths: [], reportNames, stream: NULL_SINK})
            await refineRename(project, {from: opts.from!, to: opts.to!, file: opts.renameFile ?? null, dryRun: opts.dryRun, report})
        } else if (opts.command === "format") {
            const report = await refineReport(project, {...fileOpts, reportNames, stream: NULL_SINK})
            await refineFormat(project, {...fileOpts, dryRun: opts.dryRun, report, ...opts.applyOverrides})
        } else {
            const output = selectOutput(opts.output, stream)
            // The default survey leads with the list cleanup-candidate listing,
            // then the report tables, then `## recommendation` + `### .prettierrc`.
            // Named reports and `--output` paths skip these survey-only blocks.
            if (opts.surveyDefault) {
                const entries = await refineList(project, fileOpts)
                const candidates = filterListEntries(entries, {noExports: true, noImporters: true, unusedExports: true})
                stream.write("### list --no-exports --no-importers --unused-exports\n\n")
                writeListTable(candidates, stream)
            }
            const report = await refineReport(project, {...fileOpts, reportNames, stream: output.reportStream})
            if (opts.surveyDefault) {
                writeFormatMarkdown(report, stream)
                writePrettierMarkdown(report, stream)
            }
            output.finalize(report)
        }
        return 0
    } catch (e) {
        console.error(e instanceof Error ? e.message : String(e))
        return 1
    }
}
