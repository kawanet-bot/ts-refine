// Shared post-processing for the write commands that edit imports/usages
// (move, rename): re-sort the import block of each file they changed. Each file
// is surveyed on its own (imports-only) so a project with mixed conventions
// keeps each file's existing style. Files the command didn't touch are not
// passed in, so they stay as-is until `format` unifies them.

import type {FormatCodeSettings, SourceFile} from "ts-morph"
import {formatSettingsForFiles} from "./format-settings.ts"
import {applyOrganizeImports} from "./organize-imports.ts"

// Survey each file's organize settings now (before move/rename edits), keyed
// by SourceFile — not its path — so a later move() that repaths the node still
// resolves to the right entry. importsOnly: only the file's import/export
// statements drive the recommendation.
export async function resolveImportSettings(files: Iterable<SourceFile>): Promise<Map<SourceFile, FormatCodeSettings>> {
    const byFile = new Map<SourceFile, FormatCodeSettings>()
    for (const sf of files) {
        byFile.set(sf, await formatSettingsForFiles([sf], true))
    }
    return byFile
}

// Re-sort each file's imports with its pre-resolved settings.
export function organizeChangedImports(stylesByFile: Map<SourceFile, FormatCodeSettings>): void {
    for (const [sf, settings] of stylesByFile) {
        applyOrganizeImports(sf, settings)
    }
}
