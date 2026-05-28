// Heart of `--format ts-survey`. Builds the `ts-survey` invocation that
// reproduces the report's recommendations, deriving the flags from each
// report's Partial<RunXxxOpts> return value. This is the same idea as
// `writePrettierConfig` (which builds a `.prettierrc` JSON from the
// same shape) — just emitting CLI flags instead of JSON.
//
// The two-line layout (`ts-survey \` continuation, flags on the next
// line) is intentional. Shell quoting isn't the reason — the indented
// second line lets `grep -E '^ +--'` extract just the flags so the
// recommendation can be piped back into another ts-survey invocation.

import type {TsSurveyReport} from "@kawanet/ts-survey"

import type {Writer} from "./writable.ts"

// Translates each fired recommendation into a CLI flag string. The
// emission order is fixed (numeric width → enum families) so the same
// TsSurveyReport always produces byte-identical output, even if upstream
// chose to fill the object's properties in a different order.
//
// member-separators stays in the printed command for transparency, even
// though `--fix` itself does not accept it as a parameter override —
// type-literal separator rewrites are out of scope for the LS-based
// formatter and would need a dedicated action. Surfacing the flag here
// keeps the human-facing record of the recommendation intact.
function buildTsSurveyFlags(report: TsSurveyReport): string[] {
    const flags: string[] = []
    if (report.semicolons?.semicolons) flags.push(`--semicolons ${report.semicolons.semicolons}`)
    if (typeof report.indent?.width === "number") flags.push(`--indent ${report.indent.width}`)
    if (report.memberSeparators?.separator) flags.push(`--member-separator ${report.memberSeparators.separator}`)
    if (report.newLine?.newLine) flags.push(`--new-line ${report.newLine.newLine}`)
    if (report.bracketSpacing?.bracketSpacing) flags.push(`--bracket-spacing ${report.bracketSpacing.bracketSpacing}`)
    return flags
}

// Raw output of `--format ts-survey`. The command always starts with
// `--fix` — that is the verb the recommendation translates to. Even when
// no per-field flags fire we emit `ts-survey --fix`, mirroring how
// `--format prettier` emits an empty `{}` rather than nothing.
export function writeTsSurveyCommand(report: TsSurveyReport, stream: Writer): void {
    const flags = buildTsSurveyFlags(report)
    if (flags.length === 0) {
        stream.write("ts-survey --fix\n")
        return
    }
    stream.write("ts-survey --fix \\\n")
    stream.write(`  ${flags.join(" ")}\n`)
}

// The `## recommendation` block embedded in the default-survey Markdown
// output. The whole block is skipped when no recommendations fired —
// `ts-survey --fix` with no overrides is implicit in "no recommendations"
// and so the empty block carries no information. The trailing blank line
// matches the convention every other report block follows.
export function writeTsSurveyMarkdown(report: TsSurveyReport, stream: Writer): void {
    const flags = buildTsSurveyFlags(report)
    if (flags.length === 0) return
    stream.write("## recommendation\n")
    stream.write("\n")
    stream.write("```sh\n")
    stream.write("ts-survey --fix \\\n")
    stream.write(`  ${flags.join(" ")}\n`)
    stream.write("```\n")
    stream.write("\n")
}
