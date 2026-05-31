// `report` runner: survey-default leads with the list cleanup-candidate
// listing, then the report tables, then `## recommendation` + `### .prettierrc`.
// Named reports and `--output` paths skip those survey-only blocks.

import type {Project} from "ts-morph"
import {refineList, refineReport, type TSR} from "../../index.ts"
import type {CLIStream} from "../cli-io.ts"
import {filterListEntries, writeListTable} from "../list/format-list.ts"
import {writePrettierMarkdown} from "./output-prettier.ts"
import {writeFormatMarkdown} from "./output-ts-refine.ts"
import {selectOutput} from "./select-output.ts"
import type {ReportArgs} from "./report-args.ts"

export async function runReport(project: Project, args: ReportArgs, stream: CLIStream): Promise<void> {
    // Report-name validation lives in refineReport so typos surface there.
    const reportNames = args.reportNames as TSR.ReportName[]
    const output = selectOutput(args.output, stream)

    if (args.surveyDefault) {
        const entries = await refineList(project, {paths: args.paths})
        const candidates = filterListEntries(entries, {noExports: true, noImporters: true, unusedExports: true})
        stream.write("### list --no-exports --no-importers --unused-exports\n\n")
        writeListTable(candidates, stream)
    }
    const report = await refineReport(project, {paths: args.paths, reportNames, stream: output.reportStream})
    if (args.surveyDefault) {
        writeFormatMarkdown(report, stream)
        writePrettierMarkdown(report, stream)
    }
    output.finalize(report)
}
