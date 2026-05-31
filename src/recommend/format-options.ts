// FormatStyle is the canonical per-field formatting intent. Both the
// report recommendation and the CLI overrides are funneled into it, so
// the ts-refine command output and the actual apply derive from one
// value — guaranteeing they agree. The pipeline is:
//   ReportResult ─reportToFormatOptions─┐
//                                          ├─ mergeFormatOptions ─ resolveSettings ─▶ ResolvedSettings
//   FormatStyle ─overridesToFormatOptions┘
// and buildFormatFlags renders the same FormatStyle back to argv.

import type {FormatCodeSettings} from "ts-morph"
import {ts} from "ts-morph"
import type {TSR} from "ts-refine"
import {applyReportNames} from "../report/report-names.ts"

// A CLI override pins a field, so surveying the matching report is redundant;
// organizeImports has no report. reportNamesForFormat trims the apply set to
// the reports still worth running — a fully-pinned format skips the survey.
const reportByOverride: {field: keyof TSR.FormatStyle; report: TSR.ReportName}[] = [
    {field: "semicolons", report: "semicolons"},
    {field: "indent", report: "indent"},
    {field: "newLine", report: "new-line"},
    {field: "bracketSpacing", report: "bracket-spacing"},
]

export function reportNamesForFormat(overrides: TSR.FormatStyle): TSR.ReportName[] {
    const skip = new Set(reportByOverride.filter((m) => overrides[m.field] !== undefined).map((m) => m.report))
    return applyReportNames.filter((name) => !skip.has(name))
}

// LS settings + refineFormat-only concerns (organize gate, newline post-pass).
// Local-ish shape — refineFormat reads it; the CR diagnostic is computed at
// the apply entry from the report, not carried here.
export interface ResolvedSettings {
    formatSettings: FormatCodeSettings
    organizeImports: boolean
    newLineNormalize: "\n" | "\r\n" | undefined
}

// FormatCodeSettings is readonly; build mutably and cast at the return.
type MutableFormatSettings = {-readonly [K in keyof FormatCodeSettings]: FormatCodeSettings[K]}

// Recommendation → options. `cr` is read and discarded (see FormatStyle);
// member-separators has no actionable mapping and is dropped too.
export function reportToFormatOptions(report: TSR.ReportResult): TSR.FormatStyle {
    const options: TSR.FormatStyle = {}
    if (report.semicolons?.semicolons) options.semicolons = report.semicolons.semicolons
    if (report.indent?.width !== undefined) options.indent = report.indent.width
    const newLine = report.newLine?.newLine
    if (newLine === "lf" || newLine === "crlf") options.newLine = newLine
    if (report.bracketSpacing?.bracketSpacing) options.bracketSpacing = report.bracketSpacing.bracketSpacing
    return options
}

// CLI overrides → options. A typed seam keeping parseArgs decoupled from
// the FormatStyle vocabulary; the shapes happen to line up today.
export function overridesToFormatOptions(overrides: TSR.FormatStyle): TSR.FormatStyle {
    return {
        organizeImports: overrides.organizeImports,
        indent: overrides.indent,
        semicolons: overrides.semicolons,
        newLine: overrides.newLine,
        bracketSpacing: overrides.bracketSpacing,
    }
}

// Per-field precedence: override wins over base, else base, else unset.
export function mergeFormatOptions(base: TSR.FormatStyle, override: TSR.FormatStyle): TSR.FormatStyle {
    return {
        organizeImports: override.organizeImports ?? base.organizeImports,
        indent: override.indent ?? base.indent,
        semicolons: override.semicolons ?? base.semicolons,
        newLine: override.newLine ?? base.newLine,
        bracketSpacing: override.bracketSpacing ?? base.bracketSpacing,
    }
}

// FormatStyle → the settings refineFormat hands to ts-morph.
export function resolveSettings(options: TSR.FormatStyle): ResolvedSettings {
    const formatSettings: MutableFormatSettings = {}

    // "tab" turns convertTabsToSpaces off (LS then indents with tabs);
    // a number pins space indentation at that width.
    if (options.indent === "tab") {
        formatSettings.convertTabsToSpaces = false
    } else if (typeof options.indent === "number") {
        formatSettings.indentSize = options.indent
        formatSettings.tabSize = options.indent
        formatSettings.convertTabsToSpaces = true
    }

    if (options.semicolons === "on") {
        formatSettings.semicolons = ts.SemicolonPreference.Insert
    } else if (options.semicolons === "off") {
        formatSettings.semicolons = ts.SemicolonPreference.Remove
    }

    if (options.bracketSpacing === "on") {
        formatSettings.insertSpaceAfterOpeningAndBeforeClosingNonemptyBraces = true
    } else if (options.bracketSpacing === "off") {
        formatSettings.insertSpaceAfterOpeningAndBeforeClosingNonemptyBraces = false
    }

    let newLineNormalize: "\n" | "\r\n" | undefined
    if (options.newLine === "lf") {
        formatSettings.newLineCharacter = "\n"
        newLineNormalize = "\n"
    } else if (options.newLine === "crlf") {
        formatSettings.newLineCharacter = "\r\n"
        newLineNormalize = "\r\n"
    }

    const organizeImports = options.organizeImports !== "off"

    return {formatSettings, organizeImports, newLineNormalize}
}

// Normalizes pre-existing terminators that the LS won't touch.
export function normalizeNewLines(text: string, target: "\n" | "\r\n"): string {
    // Collapse to LF first to avoid double-rewriting already-CRLF text.
    const normalized = text.replace(/\r\n|\r/g, "\n")
    return target === "\n" ? normalized : normalized.replace(/\n/g, "\r\n")
}
