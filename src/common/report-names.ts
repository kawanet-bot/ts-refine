// reportNames is the registry of report-name selectors — the full set the
// `report` command surveys and the CLI offers as `--<name>` flags.

import type {TSR} from "ts-refine"

export const reportNames: readonly TSR.ReportName[] = ["semicolons", "indent", "member-separators", "new-line", "bracket-spacing"] as const

// The apply-bearing subset: the reports format / move / rename actually consume
// (through reportToFormatStyle). It currently lists the same names as
// `reportNames`, but stays a distinct constant — the two have different roles
// (the offered registry vs. the apply set) and have diverged before / may again.
export const applyReportNames: readonly TSR.ReportName[] = ["semicolons", "indent", "member-separators", "new-line", "bracket-spacing"]
