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
import {formatMs, printTable, summarize, type Summary} from "./stats.ts"

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

// Style type erased behind defineCase so the heterogeneous passes share one
// array. Each pass keeps its own FormatStyle union at the call site (no casts);
// the swept styles are addressed by index, and a no-style pass uses `[null]`.
interface FormatCase {
    name: string
    styleCount: number
    prepare?: (sf: SourceFile) => void
    runStyle: (sf: SourceFile, styleIndex: number) => void
}

function defineCase<TStyle>(name: string, styles: readonly TStyle[], run: (sf: SourceFile, style: TStyle) => void, prepare?: (sf: SourceFile) => void): FormatCase {
    return {name, styleCount: styles.length, prepare, runStyle: (sf, i) => run(sf, styles[i])}
}

// Built on demand rather than at module load: defineCase runs once per call,
// only when a benchmark actually runs, not for every importer of this module.
function getFormatCases(): ReadonlyArray<FormatCase> {
    return [
        defineCase("applyAsiGuard", ["off", "on"] as const, applyAsiGuard),
        defineCase("applySingleLineTypeLiteralTail", ["on", "off"] as const, applySingleLineTypeLiteralTail, formatPrep),
        defineCase("applyForHeaderSemicolons", [null] as const, (sf) => applyForHeaderSemicolons(sf)),
        defineCase("applyMemberDelimiter", ["semi", "none"] as const, applyMemberDelimiter),
        defineCase("applyTrailingComma", ["on", "off"] as const, applyTrailingComma),
        defineCase("applyTypeBracketSpacing", ["on", "off"] as const, applyTypeBracketSpacing),
    ]
}

function createScratchFiles(fixtures: ReadonlyArray<Fixture>): SourceFile[] {
    const project = initInMemoryProject()
    return fixtures.map(({path, text}) => project.createSourceFile(path, text, {overwrite: true}))
}

// One timed pass over a freshly built copy of the fixtures. The passes mutate
// the SourceFiles, so each run rebuilds from the original text — otherwise a
// second run would measure an already-fixed no-op state. prepare (when present)
// runs untimed so the timed call always starts from formatted text.
function runOnce(benchCase: FormatCase, fixtures: ReadonlyArray<Fixture>, styleIndex: number): number {
    const files = createScratchFiles(fixtures)
    if (benchCase.prepare) {
        for (const sf of files) benchCase.prepare(sf)
    }
    const start = performance.now()
    for (const sf of files) benchCase.runStyle(sf, styleIndex)
    return performance.now() - start
}

export function runFormatBench(args: BenchmarkArgs, fixtures: ReadonlyArray<Fixture>, output: TSR.Writer, log: TSR.Writer): void {
    const rows: ({name: string; calls: number} & Summary)[] = []

    for (const benchCase of getFormatCases()) {
        log.write(`format: ${benchCase.name}\n`)

        const samples: number[] = []
        for (let s = 0; s < benchCase.styleCount; s++) {
            for (let i = 0; i < args.warmup; i++) runOnce(benchCase, fixtures, s)
            for (let i = 0; i < args.iterations; i++) samples.push(runOnce(benchCase, fixtures, s))
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
