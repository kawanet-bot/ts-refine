// Format section: time each self-pass refineFormat applies after the language
// service formatter. Every pass runs over fresh in-memory copies of the project
// sources; passes that only act on already-formatted text are prepared with one
// untimed formatText so they have realistic work to do.

import {performance} from "node:perf_hooks"
import type {TSR} from "ts-refine"
import type {SourceFile} from "../../src/bridge/bridge.ts"
import {applyAsiGuard} from "../../src/format/apply-asi-guard.ts"
import {applyForHeaderSemicolons} from "../../src/format/apply-for-header-semicolons.ts"
import {applyMemberDelimiter} from "../../src/format/apply-member-delimiter.ts"
import {applySingleLineTypeLiteralTail} from "../../src/format/apply-single-line-type-literal.ts"
import {applyTrailingComma} from "../../src/format/apply-trailing-comma.ts"
import {applyTypeBracketSpacing} from "../../src/format/apply-type-bracket-spacing.ts"
import {formatStyleToSettings} from "../../src/lib/format-settings.ts"
import type {BenchmarkArgs} from "./parse-benchmark-args.ts"
import {createScratchFiles, type Fixture} from "./scratch.ts"
import {printStatsTable, type StatRow, summarize} from "./stats.ts"

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
    // refineFormat runs asi-guard / single-line-tail / for-header *after*
    // formatText, so without a matching prep they only time a near-noop
    // early-return. Prep each at the semi the language service diverges on:
    // asi-guard on `off` (restores `;(`), single-line-tail on `on` (trims the
    // appended `;`); for-header is semi-independent. The member/trailing/bracket
    // passes act on the parsed tree regardless, so they need no prep.
    const prepAt = (semi: TSR.FormatStyle["semi"]): ((sf: SourceFile) => void) => {
        const settings = formatStyleToSettings({semi, indent: 4, newLine: "lf"})
        return (sf) => {
            sf.forgetDescendants()
            sf.formatText(settings)
        }
    }
    const prepSemiOn = prepAt("on")

    return [
        defineCase("applyAsiGuard", ["off", "on"] as const, applyAsiGuard, prepAt("off")),
        defineCase("applySingleLineTypeLiteralTail", ["on", "off"] as const, applySingleLineTypeLiteralTail, prepSemiOn),
        defineCase("applyForHeaderSemicolons", [null] as const, (sf) => applyForHeaderSemicolons(sf), prepSemiOn),
        defineCase("applyMemberDelimiter", ["semi", "none"] as const, applyMemberDelimiter),
        defineCase("applyTrailingComma", ["on", "off"] as const, applyTrailingComma),
        defineCase("applyTypeBracketSpacing", ["on", "off"] as const, applyTypeBracketSpacing),
    ]
}

// One timed pass over a freshly built (cold) copy of the fixtures. The passes
// mutate the SourceFiles, so each run rebuilds from the original text — both to
// avoid timing an already-fixed no-op and to measure the cold path the tool
// actually runs. prepare (when present) runs untimed so the timed call starts
// from the post-formatter state refineFormat's self-passes see.
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
    const rows: StatRow[] = []

    for (const benchCase of getFormatCases()) {
        log.write(`format: ${benchCase.name}\n`)

        const samples: number[] = []
        for (let s = 0; s < benchCase.styleCount; s++) {
            // One fixed warmup run (the 0th), discarded; then the measured runs.
            runOnce(benchCase, fixtures, s)
            for (let i = 0; i < args.iterations; i++) samples.push(runOnce(benchCase, fixtures, s))
        }

        rows.push({name: benchCase.name, calls: samples.length, ...summarize(samples)})
    }

    printStatsTable(output, "pass", rows)
}
