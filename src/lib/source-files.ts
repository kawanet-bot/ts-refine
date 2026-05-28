// Source file selection shared between action and report.
// `include` is forwarded to ts-morph (initial set); `exclude` runs as a
// post filter via minimatch. Passing only negative globs to ts-morph would
// yield an empty set, hence the split handling.

import {minimatch} from "minimatch"
import path from "node:path"
import type {Project, SourceFile} from "ts-morph"

import type {TsSurveyOpts} from "./types.ts"

export function selectSourceFiles(project: Project, {absIncludes, absExcludes}: TsSurveyOpts): SourceFile[] {
    let files = absIncludes.length > 0 ? project.getSourceFiles(absIncludes) : project.getSourceFiles()
    if (absExcludes.length > 0) {
        files = files.filter((sf) => {
            const p = sf.getFilePath()
            return !absExcludes.some((pat) => minimatch(p, pat))
        })
    }
    return files
}

// Shortens display paths by removing the leading `../` chain that
// path.relative leaves when the source lives outside the current cwd.
export function displayPath(absPath: string): string {
    return path.relative(process.cwd(), absPath).replace(/^.*\/\.\.\//, "")
}
