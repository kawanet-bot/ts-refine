// Runtime list of report-name strings, isolated from the dispatcher in
// run-reports.ts. Splitting it out lets parse-args / usage / external
// consumers reach the list without dragging in every report module
// (and through them, ts-morph) — the only sibling import is a type, so
// this file has zero runtime cost.

import type {TsSurveyReportName} from "@kawanet/ts-survey"

// `as const` keeps the literal tuple at the type level so the union is
// still inferrable here, while the annotation pins the array element
// type to the published TsSurveyReportName union — a typo on either
// side fails tsc at this assignment.
export const reportNames: readonly TsSurveyReportName[] = [
    "unused-exports",
    "semicolons",
    "indent",
    "member-separators",
    "new-line",
    "bracket-spacing",
] as const
