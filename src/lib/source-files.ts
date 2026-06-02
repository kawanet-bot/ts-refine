// Source file selection shared between action and report. The positional
// file arguments (absolute) are forwarded to ts-morph; an empty list means
// the whole project.

import path from "node:path"
import {type Project, ScriptKind, type SourceFile} from "ts-morph"
import type {TSR} from "ts-refine"

// In-project command/refactor targets only. External declarations (TS lib,
// @types/*, node_modules) are load-only; JSON modules aren't TypeScript and the
// language service would corrupt them. The project's own .d.ts stays.
function isInProject(sf: SourceFile): boolean {
    return !sf.isFromExternalLibrary() && sf.getScriptKind() !== ScriptKind.JSON
}

export function selectSourceFiles(project: Project, {paths}: Pick<TSR.ReportOpts, "paths">): SourceFile[] {
    if (paths.length > 0) {
        const targets = project.getSourceFiles(paths).filter(isInProject)

        // A typo'd / non-project path would otherwise pass silently as "0
        // files". Fewer resolved than given means something matched nothing:
        // name them when nothing matched, stay generic on a partial miss
        // (pinpointing which of several missed is not worth the lookup).
        if (targets.length === 0) throw new Error(`refine: no project files matched: ${paths.map(displayPath).join(", ")}`)
        if (targets.length < paths.length) throw new Error("refine: some target paths matched no project files")
        return targets
    }

    const all = project.getSourceFiles().filter(isInProject)
    if (all.length === 0) throw new Error("refine: no source files found in the project")
    return all
}

// Every in-project source file, unscoped — for whole-project symbol resolution
// that must not reach into dependencies (see resolve-target).
export function inProjectSourceFiles(project: Project): SourceFile[] {
    return project.getSourceFiles().filter(isInProject)
}

// One in-project file by path. Throws when it is missing or an external-library
// declaration, so a file scope can never point a lookup into a dependency.
export function inProjectSourceFileOrThrow(project: Project, file: string): SourceFile {
    const sf = project.getSourceFile(file)
    if (!sf || !isInProject(sf)) throw new Error(`refine: not in the project: ${file}`)
    return sf
}

// Shortens long paths by dropping everything through the last interior
// `/../`. A leading `../` chain is left alone because it can still be useful
// context when the command itself was run from a nearby relative tsconfig.
export function displayPath(absPath: string): string {
    return path.relative(process.cwd(), absPath).replace(/^.*[/\\]\.\.[/\\]/, "")
}
