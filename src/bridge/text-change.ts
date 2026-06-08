import type ts from "typescript"
import type {Project} from "./project.ts"

// Applies TypeScript text edits from the bottom of a file upward. TS LS edits
// are span-based over the pre-edit text, so reverse order keeps every earlier
// offset stable without needing a diff engine.
export function applyTextChanges(text: string, changes: readonly ts.TextChange[]): string {
    let result = text
    const sorted = [...changes].sort((a, b) => b.span.start - a.span.start)
    for (const change of sorted) {
        const {start, length} = change.span
        result = result.slice(0, start) + change.newText + result.slice(start + length)
    }
    return result
}

// FileTextChanges wrapper used by code fixes and organizeImports. It mirrors
// only the apply path ts-refine needs, including creation of missing files.
export class FileTextChanges {
    private readonly project: Project
    private readonly change: ts.FileTextChanges

    constructor(project: Project, change: ts.FileTextChanges) {
        this.project = project
        this.change = change
    }

    getFilePath(): string {
        return this.change.fileName
    }

    getTextChanges(): ts.TextChange[] {
        return [...this.change.textChanges]
    }

    applyChanges(): this {
        const sf = this.project.getOrCreateSourceFile(this.change.fileName)
        sf.replaceWithText(applyTextChanges(sf.getFullText(), this.change.textChanges))
        return this
    }
}

// CombinedCodeActions wrapper keeps TypeScript fix-all edits composable with
// the bridge SourceFile cache instead of writing through the host directly.
export class CombinedCodeActions {
    private readonly project: Project
    private readonly actions: ts.CombinedCodeActions

    constructor(project: Project, actions: ts.CombinedCodeActions) {
        this.project = project
        this.actions = actions
    }

    applyChanges(): this {
        for (const change of this.actions.changes) {
            new FileTextChanges(this.project, change).applyChanges()
        }
        return this
    }
}
