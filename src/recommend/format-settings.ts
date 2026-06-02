import type {FormatCodeSettings} from "ts-morph"
import {ts} from "ts-morph"
import type {TSR} from "ts-refine"

// LS settings + the newline post-pass refineFormat runs after formatText.
// Local-ish shape — refineFormat reads it; the CR diagnostic is computed at
// the apply entry from the report, not carried here. The organize-imports
// gate lives on FormatOpts now, so it is resolved separately by the caller.
interface FormatSettings {
    formatSettings: FormatCodeSettings
    newLineNormalize: "\n" | "\r\n" | undefined
}

// FormatCodeSettings is readonly; build mutably and cast at the return.
type MutableFormatSettings = {-readonly [K in keyof FormatCodeSettings]: FormatCodeSettings[K]}

// FormatStyle → the settings refineFormat hands to ts-morph.
export function formatStyleToSettings(options: TSR.FormatStyle): FormatSettings {
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

    return {formatSettings, newLineNormalize}
}

// Normalizes pre-existing terminators that the LS won't touch.
export function normalizeNewLines(text: string, target: "\n" | "\r\n"): string {
    // Collapse to LF first to avoid double-rewriting already-CRLF text.
    const normalized = text.replace(/\r\n|\r/g, "\n")
    return target === "\n" ? normalized : normalized.replace(/\n/g, "\r\n")
}
