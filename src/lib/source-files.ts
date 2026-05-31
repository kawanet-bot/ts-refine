// Source file selection shared between action and report. The positional
// file arguments (absolute) are forwarded to ts-morph; an empty list means
// the whole project.

import path from "node:path"
import type {Project, SourceFile} from "ts-morph"
import type {TSR} from "ts-refine"

export function selectSourceFiles(project: Project, {paths}: Pick<TSR.ReportOpts, "paths">): SourceFile[] {
    const files = paths.length > 0 ? project.getSourceFiles(paths) : project.getSourceFiles()
    // Never a command target: external declarations (TS lib, @types/* pulled in
    // via tsconfig) the program loads for type-checking. The project's own .d.ts
    // stays — it is not external — which is the point of including .d.ts at all.
    return files.filter((sf) => !sf.isFromExternalLibrary())
}

// Shortens long paths by dropping everything through the last interior
// `/../`. A leading `../` chain is left alone because it can still be useful
// context when the command itself was run from a nearby relative tsconfig.
export function displayPath(absPath: string): string {
    return path.relative(process.cwd(), absPath).replace(/^.*[/\\]\.\.[/\\]/, "")
}
