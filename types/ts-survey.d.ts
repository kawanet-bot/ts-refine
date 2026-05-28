/**
 * https://github.com/kawanet/ts-survey
 */

import type {Project} from "ts-morph";

export {}; // external module indicator

// Internal sink contract used by report writers. Consumers never construct
// or name this directly; they pass `process.stdout` or any object with a
// `write(line)` method as `RunReportsOpts.stream`.
type Writer = {write: (line: string) => void}

// Common base for every entry. Not exported — consumers reach the fields
// through the leaf Opts interfaces below.
interface TsSurveyOpts {
    absIncludes: string[]
    absExcludes: string[]
}

// The four interfaces below describe the *shape* of a recommendation. They
// are not runtime function inputs anymore — the dedicated `run<X>` exports
// were retired in favor of the unified `runFix`. They survive as the value
// type of the matching `TsSurveyReport` slot, so that a recommendation
// always carries the same field that an old-style action would have taken.

export interface RunSemicolonsOpts {
    semicolons: "on" | "off"
}

export interface RunIndentOpts {
    width: number
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

// Every report module that runReports knows about. Adding a report
// means extending this union, the runtime list in
// src/report/report-names.ts, and the dispatch in src/report/run-reports.ts.
export type TsSurveyReportName =
    | "unused-exports"
    | "semicolons"
    | "indent"
    | "member-separators"
    | "new-line"
    | "bracket-spacing"

export interface RunReportsOpts extends TsSurveyOpts {
    stream: Writer
    reportNames: TsSurveyReportName[]
}

// Recommendations collected by runReports, keyed by the report that
// produced them. Each value is the partial of the matching action's
// Opts that the report would suggest applying; missing keys mean the
// report didn't run or had nothing to recommend.
export interface TsSurveyReport {
    semicolons?: Partial<RunSemicolonsOpts>
    indent?: Partial<RunIndentOpts>
    memberSeparators?: Partial<RunMemberSeparatorsOpts>
    newLine?: Partial<RunNewLineOpts>
    bracketSpacing?: Partial<RunBracketSpacingOpts>
}

// Input to the unified `runFix` action. `report` carries the recommended
// defaults; any field set on `RunFixOpts` itself overrides the matching
// slot of the report. An omitted override means "follow the report"; a
// report slot that is itself empty means "leave that aspect alone".
//
// `organizeImports` defaults to "on" when omitted — `--fix` always
// organizes imports unless the user opts out with `--organize-imports off`.
export interface RunFixOpts extends TsSurveyOpts {
    dryRun: boolean
    report: TsSurveyReport
    organizeImports?: "on" | "off"
    indent?: number
    semicolons?: "on" | "off"
    // CR-only line endings are not representable in the TS Language Service's
    // formatter (`newLineCharacter` accepts `\n` and `\r\n` only). `runFix`
    // therefore narrows the override surface to those two values; a `cr`
    // recommendation from the report is reported on stderr but not applied.
    newLine?: "lf" | "crlf"
    bracketSpacing?: "on" | "off"
}

export declare function initProject(tsconfigPath: string): Project

export declare function runReports(project: Project, opts: RunReportsOpts): Promise<TsSurveyReport>

export declare function runFix(project: Project, opts: RunFixOpts): Promise<void>
