// Report section: time each runReport* pass over the same SourceFile[] the
// real `report` command would scan. Output is sunk to a no-op writer so only
// the timing table reaches the user.

import {performance} from "node:perf_hooks"
import type {TSR} from "ts-refine"
import type {SourceFile} from "../../src/bridge/bridge.ts"
import {runReportBracketSpacing} from "../../src/report/bracket-spacing.ts"
import {runReportFunctionSpacing} from "../../src/report/function-spacing.ts"
import {runReportIndent} from "../../src/report/indent.ts"
import {runReportMemberDelimiter} from "../../src/report/member-delimiter.ts"
import {runReportNewLine} from "../../src/report/new-line.ts"
import type {ReportRunOpts} from "../../src/report/report-run-opts.ts"
import {runReportSemi} from "../../src/report/semi.ts"
import {runReportTrailingComma} from "../../src/report/trailing-comma.ts"
import type {BenchmarkArgs} from "./parse-benchmark-args.ts"
import {formatMs, printTable, summarize, type Summary} from "./stats.ts"

const REPORTS: ReadonlyArray<readonly [string, (opts: ReportRunOpts) => Promise<unknown>]> = [
    ["semi", runReportSemi],
    ["indent", runReportIndent],
    ["member-delimiter", runReportMemberDelimiter],
    ["new-line", runReportNewLine],
    ["bracket-spacing", runReportBracketSpacing],
    ["trailing-comma", runReportTrailingComma],
    ["function-spacing", runReportFunctionSpacing],
]

const quiet: TSR.Writer = {write: (): void => undefined}

export async function runReportBench(args: BenchmarkArgs, sourceFiles: SourceFile[], output: TSR.Writer, log: TSR.Writer): Promise<void> {
    const rows: ({name: string} & Summary)[] = []

    for (const [name, run] of REPORTS) {
        log.write(`report: ${name}\n`)
        const opts: ReportRunOpts = {sourceFiles, output: quiet, log: quiet, importsOnly: args.importsOnly}

        for (let i = 0; i < args.warmup; i++) {
            await run(opts)
        }

        const samples: number[] = []
        for (let i = 0; i < args.iterations; i++) {
            const start = performance.now()
            await run(opts)
            samples.push(performance.now() - start)
        }

        rows.push({name, ...summarize(samples)})
    }

    rows.sort((a, b) => b.mean - a.mean)
    printTable(
        output,
        ["report", "mean", "median", "min", "max"],
        rows.map((row) => [row.name, formatMs(row.mean), formatMs(row.median), formatMs(row.min), formatMs(row.max)]),
    )
}
