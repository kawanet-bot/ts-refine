/**
 * https://github.com/kawanet/ts-survey
 */

import type {Project} from "ts-morph";

export {}; // external module indicator

// Common base for every entry. Leaf Opts interfaces inherit it.
// paths holds the positional file arguments (absolute); empty means
// the whole project.
interface TsSurveyOpts {
    paths: string[]
}

// Recommendation shapes. Not runtime inputs — they describe the value
// type of each `TsSurveyReport` slot.

export interface RunSemicolonsOpts {
    semicolons: "on" | "off"
}

// "tab" recommends tab indentation (LS convertTabsToSpaces:false /
// Prettier useTabs); a number recommends that many spaces.
export interface RunIndentOpts {
    width: number | "tab"
}

export interface RunMemberSeparatorsOpts {
    separator: "semi" | "comma" | "none"
}

export interface RunNewLineOpts {
    newLine: "lf" | "crlf" | "cr"
}

export interface RunBracketSpacingOpts {
    bracketSpacing: "on" | "off"
}

// Every report runReports knows about. Pair with src/report/report-names.ts
// (runtime list) and src/report/run-reports.ts (dispatch).
export type TsSurveyReportName =
    | "semicolons"
    | "indent"
    | "member-separators"
    | "new-line"
    | "bracket-spacing"

export interface RunReportsOpts extends TsSurveyOpts {
    stream: {write: (line: string) => void}
    reportNames: TsSurveyReportName[]
}

// Per-report recommendations. A missing key means the report didn't run
// or had nothing to recommend.
export interface TsSurveyReport {
    semicolons?: Partial<RunSemicolonsOpts>
    indent?: Partial<RunIndentOpts>
    memberSeparators?: Partial<RunMemberSeparatorsOpts>
    newLine?: Partial<RunNewLineOpts>
    bracketSpacing?: Partial<RunBracketSpacingOpts>
}

// Input to `runReformat`. `report` provides defaults; the top-level
// overrides win per field. `organizeImports` defaults to "on".
export interface RunReformatOpts extends TsSurveyOpts {
    dryRun: boolean
    report: TsSurveyReport
    organizeImports?: "on" | "off"
    indent?: number | "tab"
    semicolons?: "on" | "off"
    // LS `newLineCharacter` only accepts \n / \r\n; a `cr` recommendation
    // is logged but not applied.
    newLine?: "lf" | "crlf"
    bracketSpacing?: "on" | "off"
}

// One row of `list` output: per-file export / usage counts. runList returns
// the full set (unfiltered) so later commands can reuse the snapshot; the
// CLI applies the --no-exports / --no-importers / --unused-exports filters.
export interface ListEntry {
    file: string
    exports: number
    unused: number
    importers: number
}

export interface RunListOpts extends TsSurveyOpts {}

// Per-file inspect output. Each requested inspector populates its slot
// (a missing key means the inspector did not run for this file).
export interface InspectFile {
    file: string
    exports?: InspectExport[]
    importers?: InspectImporter[]
}

// One exported declaration. `example` is the alphabetically first
// importer file path, or null when no external file uses this export
// (rendered as **unused** in the Markdown table).
export interface InspectExport {
    line: number
    kind: string
    name: string
    importers: number
    example: string | null
}

// One importer of the inspected file (collapsed to a single row even when
// the importer has several import statements). `kinds` covers the import
// forms used: value | type | namespace | dynamic | side-effect | re-export.
// `names` lists the imported symbol names, with display tokens for forms
// that don't carry names (`* as A`, `(dynamic)`, `(side effect)`).
export interface InspectImporter {
    file: string
    kinds: string[]
    names: string[]
}

// Every inspector runInspect knows about. Pair with src/inspect/inspector-names.ts
// (runtime list) and src/inspect/run-inspect.ts (dispatch).
export type InspectorName = "exports" | "importers"

export interface RunInspectOpts extends TsSurveyOpts {
    inspectorNames: InspectorName[]
}

export declare function initProject(tsconfigPath: string): Project

export declare function runReports(project: Project, opts: RunReportsOpts): Promise<TsSurveyReport>

export declare function runReformat(project: Project, opts: RunReformatOpts): Promise<void>

export declare function runList(project: Project, opts: RunListOpts): Promise<ListEntry[]>

export declare function runInspect(project: Project, opts: RunInspectOpts): Promise<InspectFile[]>
