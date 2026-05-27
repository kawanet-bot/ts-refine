/**
 * https://github.com/kawanet/ts-survey
 */

import type {Project} from "ts-morph"

export {} // external module indicator

export type Writer = {write: (line: string) => void}

export type OrganizeOpts = {
    absIncludes: string[]
    absExcludes: string[]
    dryRun: boolean
}

export type SemiOpts = OrganizeOpts & {
    mode: "remove" | "insert"
}

export type RunReportsOpts = {
    absIncludes: string[]
    absExcludes: string[]
    stream: Writer
    reportNames: string[]
}

export declare function initProject(tsconfigPath: string): Project

export declare function runOrganizeImports(project: Project, opts: OrganizeOpts): Promise<void>

export declare function runSemicolons(project: Project, opts: SemiOpts): Promise<void>

export declare function runReports(project: Project, opts: RunReportsOpts): Promise<void>
