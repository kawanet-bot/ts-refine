// Shared option shapes used by every public entry. Kept in one place so a
// new top-level option (e.g. another scoping knob alongside absIncludes /
// absExcludes) only needs to grow this base interface; the action and
// report Opts inherit it.
//
// Not re-exported from the package's public types — consumers reach the
// fields through the leaf Opts interfaces (RunFixOpts, RunReportsOpts)
// rather than naming the base directly.

import type {TsSurveyReport} from "@kawanet/ts-survey"
import type {FormatCodeSettings} from "ts-morph"

import type {Writer} from "./writable.ts"

export interface TsSurveyOpts {
    absIncludes: string[]
    absExcludes: string[]
}

export interface ReportOpts extends TsSurveyOpts {
    stream: Writer
}

// The merge helper accepts the same shape as the published TsSurveyReport;
// the alias exists so merge-recommendations.ts can name the input without
// pulling the whole package type into its own module's parameter line.
export type TsSurveyReportForMerge = TsSurveyReport

// Output of `mergeRecommendations`. Splits LS-formatter input from the
// extra runFix concerns (organize-imports gate, line-ending post-pass,
// CR-only diagnostic) so the action layer can dispatch each cleanly.
export interface ResolvedSettings {
    formatSettings: FormatCodeSettings
    organizeImports: boolean
    // Set only when the user (or the report) asked for a specific line
    // ending. Triggers the post-format normalization pass.
    newLineNormalize: "\n" | "\r\n" | undefined
    // True when the report recommended CR-only but no override forced an
    // applicable value. runFix logs this and leaves line endings as-is.
    crRecommended: boolean
}
