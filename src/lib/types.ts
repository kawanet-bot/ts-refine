// Internal option shapes shared across action / report modules.

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

// Alias so merge-recommendations.ts can name the input concisely.
export type TsSurveyReportForMerge = TsSurveyReport

// mergeRecommendations output. Separates LS settings from runApply-only
// concerns (organize-imports gate, line-ending post-pass, CR diagnostic).
export interface ResolvedSettings {
    formatSettings: FormatCodeSettings
    organizeImports: boolean
    newLineNormalize: "\n" | "\r\n" | undefined
    crRecommended: boolean
}
