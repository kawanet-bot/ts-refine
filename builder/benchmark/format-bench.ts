// Format section: time each self-pass refineFormat applies after the language
// service formatter. Every pass runs over fresh in-memory copies of the project
// sources; passes that only act on already-formatted text are prepared with one
// untimed formatText so they have realistic work to do.

import {performance} from "node:perf_hooks"
import type {TSR} from "ts-refine"
import type {SourceFile} from "../../src/bridge/bridge.ts"
import {initInMemoryProject} from "../../src/common/init-project.ts"
import {applyAsiGuard} from "../../src/format/apply-asi-guard.ts"
import {applyForHeaderSemicolons} from "../../src/format/apply-for-header-semicolons.ts"
import {applyMemberDelimiter} from "../../src/format/apply-member-delimiter.ts"
import {applySingleLineTypeLiteralTail} from "../../src/format/apply-single-line-type-literal.ts"
import {applyTrailingComma} from "../../src/format/apply-trailing-comma.ts"
import {applyTypeBracketSpacing} from "../../src/format/apply-type-bracket-spacing.ts"
import {formatStyleToSettings} from "../../src/lib/format-settings.ts"
import type {BenchmarkArgs} from "./parse-benchmark-args.ts"
import {formatMs, printTable, summarize} from "./stats.ts"

export interface Fixture {
    path: string
    text: string
}

// One untimed formatText to mimic the language-service pass refineFormat runs
// before its self-passes. Only single-line-type-literal needs it (it trims a
// tail the formatter inserts); the others act on the parsed tree regardless.
const PREP_SETTINGS = formatStyleToSettings({semi: "on", indent: 4, newLine: "lf"})

function formatPrep(sf: SourceFile): void {
    sf.forgetDescendants()
    sf.formatText(PREP_SETTINGS)
}

interface FormatCase {
    name: string
    // Style values swept within one cycle; null marks a pass that takes no style.
    // Each run casts back to the pass's own FormatStyle union from these literals.
    styles: ReadonlyArray<string | null>
    prepare?: (sf: SourceFile) => void
    run: (sf: SourceFile, style: string | null) => void
}

const FORMAT_CASES: ReadonlyArray<FormatCase> = [
    {name: "applyAsiGuard", styles: ["off", "on"], run: (sf, style) => applyAsiGuard(sf, style as TSR.FormatStyle["semi"])},
    {name: "applySingleLineTypeLiteralTail", styles: ["on", "off"], prepare: formatPrep, run: (sf, style) => applySingleLineTypeLiteralTail(sf, style as TSR.FormatStyle["semi"])},
    {name: "applyForHeaderSemicolons", styles: [null], run: (sf) => applyForHeaderSemicolons(sf)},
    {name: "applyMemberDelimiter", styles: ["semi", "none"], run: (sf, style) => applyMemberDelimiter(sf, style as TSR.FormatStyle["memberDelimiter"])},
    {name: "applyTrailingComma", styles: ["on", "off"], run: (sf, style) => applyTrailingComma(sf, style as TSR.FormatStyle["trailingComma"])},
    {name: "applyTypeBracketSpacing", styles: ["on", "off"], run: (sf, style) => applyTypeBracketSpacing(sf, style as TSR.FormatStyle["bracketSpacing"])},
]

function createScratchFiles(fixtures: ReadonlyArray<Fixture>): SourceFile[] {
    const project = initInMemoryProject()
    return fixtures.map(({path, text}) => project.createSourceFile(path, text, {overwrite: true}))
}

// One cycle sweeps every style once. prepare (when present) runs untimed before
// each style so the timed call always starts from formatted text.
function runCycle(benchCase: FormatCase, files: SourceFile[], measured: boolean, samples: number[]): void {
    for (const style of benchCase.styles) {
        if (benchCase.prepare) {
            for (const sf of files) benchCase.prepare(sf)
        }
        const start = performance.now()
        for (const sf of files) benchCase.run(sf, style)
        if (measured) samples.push(performance.now() - start)
    }
}

export function runFormatBench(args: BenchmarkArgs, fixtures: ReadonlyArray<Fixture>, output: TSR.Writer, log: TSR.Writer): void {
    const rows: {name: string; calls: number; total: number; mean: number; median: number; min: number; max: number}[] = []

    for (const benchCase of FORMAT_CASES) {
        log.write(`format: ${benchCase.name}\n`)
        const files = createScratchFiles(fixtures)

        for (let i = 0; i < args.warmup; i++) {
            runCycle(benchCase, files, false, [])
        }

        const samples: number[] = []
        for (let i = 0; i < args.iterations; i++) {
            runCycle(benchCase, files, true, samples)
        }

        rows.push({name: benchCase.name, calls: samples.length, ...summarize(samples)})
    }

    rows.sort((a, b) => b.mean - a.mean)
    printTable(
        output,
        ["pass", "calls", "total", "mean", "median", "min", "max"],
        rows.map((row) => [row.name, String(row.calls), formatMs(row.total), formatMs(row.mean), formatMs(row.median), formatMs(row.min), formatMs(row.max)]),
    )
}
