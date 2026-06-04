// reportNames is the registry of report-name selectors — the full set the
// `report` command surveys and the CLI offers as `--<name>` flags.

import type {TSR} from "ts-refine"

export const reportNames: readonly TSR.ReportName[] = ["semicolons", "indent", "member-separators", "new-line", "bracket-spacing", "trailing-comma"] as const

// Reports the `format` command applies. Kept distinct from `reportNames` even
// when the values coincide: the offered registry and the format apply set
// differ in role and may diverge again.
export const formatReportNames: readonly TSR.ReportName[] = ["semicolons", "indent", "member-separators", "new-line", "bracket-spacing", "trailing-comma"]

// Reports for the per-file import survey (formatSettingsForFile, used by
// imports/move/rename): the LS-mappable axes plus trailing-comma, which has no
// LS mapping but applies to import/export specifiers (reasserted by a self-pass).
// member-separators is absent — it never appears in import statements.
export const importReportNames: readonly TSR.ReportName[] = ["semicolons", "indent", "new-line", "bracket-spacing", "trailing-comma"]
