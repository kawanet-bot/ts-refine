// Resolves a TsSurveyReport + the CLI's fix overrides into the concrete
// settings the `runFix` action needs. Lives as a pure helper so the
// merge logic can be unit-tested without invoking ts-morph or touching
// the filesystem.
//
// Precedence per field: override wins, otherwise the report's
// recommendation, otherwise the field is left undefined (= "leave that
// aspect alone, the LS formatter keeps its default").
//
// Two concerns are kept separate from the FormatCodeSettings the LS
// consumes:
//   - organizeImports — gated by its own boolean (defaults to true under
//     `--fix`, can be disabled with `--organize-imports off`).
//   - newLineNormalize — the LS only uses `newLineCharacter` for inserted
//     text, so existing terminators must be normalized via a separate
//     pass over the final file content.

import {ts} from "ts-morph"

import type {FixOverrides} from "./parse-args.ts"
import type {ResolvedSettings, TsSurveyReportForMerge} from "./types.ts"

// FormatCodeSettings is a `readonly` interface; we build a mutable bag
// here and cast at the return site. The runtime shape is byte-identical.
type MutableFormatSettings = {-readonly [K in keyof ResolvedSettings["formatSettings"]]: ResolvedSettings["formatSettings"][K]}

export function mergeRecommendations(report: TsSurveyReportForMerge, overrides: FixOverrides): ResolvedSettings {
    const formatSettings: MutableFormatSettings = {}

    // Indent: override wins, else recommended width. `convertTabsToSpaces`
    // is pinned to true whenever a width applies — the recommender always
    // speaks in spaces, and mixing tabs in would defeat the override.
    const indent = overrides.indent ?? report.indent?.width
    if (typeof indent === "number") {
        formatSettings.indentSize = indent
        formatSettings.tabSize = indent
        formatSettings.convertTabsToSpaces = true
    }

    // Semicolons: map our on|off vocabulary onto ts.SemicolonPreference.
    // The "Ignore" value (LS's default) is what we want when neither side
    // speaks, so we just skip the field.
    const semicolons = overrides.semicolons ?? report.semicolons?.semicolons
    if (semicolons === "on") {
        formatSettings.semicolons = ts.SemicolonPreference.Insert
    } else if (semicolons === "off") {
        formatSettings.semicolons = ts.SemicolonPreference.Remove
    }

    // Bracket spacing maps 1:1 to the FormatCodeSettings field of the
    // same intent.
    const bracketSpacing = overrides.bracketSpacing ?? report.bracketSpacing?.bracketSpacing
    if (bracketSpacing === "on") {
        formatSettings.insertSpaceAfterOpeningAndBeforeClosingNonemptyBraces = true
    } else if (bracketSpacing === "off") {
        formatSettings.insertSpaceAfterOpeningAndBeforeClosingNonemptyBraces = false
    }

    // New line: the override is narrowed to lf|crlf in parse-args because
    // the LS formatter cannot emit CR-only newlines. A `cr` recommendation
    // from the report is acknowledged (returned in `crRecommended`) but not
    // applied — runFix logs it for the operator instead.
    const reportedNewLine = report.newLine?.newLine
    const crRecommended = overrides.newLine === undefined && reportedNewLine === "cr"
    const effectiveNewLine = overrides.newLine ?? (reportedNewLine === "cr" ? undefined : reportedNewLine)
    let newLineNormalize: "\n" | "\r\n" | undefined
    if (effectiveNewLine === "lf") {
        formatSettings.newLineCharacter = "\n"
        newLineNormalize = "\n"
    } else if (effectiveNewLine === "crlf") {
        formatSettings.newLineCharacter = "\r\n"
        newLineNormalize = "\r\n"
    }

    // organize-imports defaults to true under --fix; --organize-imports off
    // is the only way to suppress it.
    const organizeImports = overrides.organizeImports !== "off"

    return {formatSettings, organizeImports, newLineNormalize, crRecommended}
}

// Applies the line-terminator normalization that the LS formatter does
// not handle for pre-existing terminators. Both CR-only and CRLF are
// collapsed to the target so the file ends up uniform.
export function normalizeNewLines(text: string, target: "\n" | "\r\n"): string {
    // Two-step replace: collapse every CRLF and lone CR to LF first, then
    // rewrite to CRLF only if the target asks for it. This avoids the
    // double-rewrite hazard of `replace(\r\n, \r\n)` on already-CRLF text.
    const normalized = text.replace(/\r\n|\r/g, "\n")
    return target === "\n" ? normalized : normalized.replace(/\n/g, "\r\n")
}
