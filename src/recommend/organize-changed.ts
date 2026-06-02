// Shared post-processing for the write commands that edit imports/usages
// (move, rename): re-sort the import block of each file they changed, using
// the project-wide surveyed style so the result converges on the codebase's
// conventions rather than each file's own. Files the command didn't touch
// are not passed in, so they stay as-is until `format` unifies them.

import type {SourceFile} from "ts-morph"
import type {TSR} from "ts-refine"
import {applyOrganizeImports} from "../lib/organize-imports.ts"
import {formatStyleToSettings} from "./format-settings.ts"

export function organizeChangedImports(files: Iterable<SourceFile>, format: TSR.FormatStyle): void {
    // move/rename always re-sort the files they rewrote — organizeImports is a
    // `format`-only behavior flag and never gates this path. The surveyed style
    // only supplies the sort settings.
    const {formatSettings} = formatStyleToSettings(format)
    for (const sf of files) {
        applyOrganizeImports(sf, formatSettings)
    }
}
