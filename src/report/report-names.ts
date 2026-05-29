// reportNames is the registry of report-name selectors. Every entry is
// also a reformat input (recommendation-bearing), so the reformat command
// runs the same set. Kept as a `reportNames` export so future split-out
// (Markdown-only vs apply-bearing) is a one-line change here.

import type {TsSurveyReportName} from "@kawanet/ts-survey"

export const reportNames: readonly TsSurveyReportName[] = [
    "semicolons",
    "indent",
    "member-separators",
    "new-line",
    "bracket-spacing",
] as const

// reformat's default report set is currently the full registry.
export const applyReportNames: readonly TsSurveyReportName[] = reportNames
