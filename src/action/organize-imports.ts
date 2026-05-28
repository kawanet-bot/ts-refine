// --organize-imports: apply the Language Service organizeImports to every
// matched source file. Writes only files whose text actually changed, by
// comparing getFullText() before and after.

import type * as declared from "@kawanet/ts-survey"
import fs from "node:fs/promises"

import {selectSourceFiles} from "../lib/source-files.ts"

export const runOrganizeImports: typeof declared.runOrganizeImports = async (project, {dryRun, absIncludes, absExcludes}) => {
    // Force no spaces inside braces (`{A}`). Semicolon handling lives in the
    // dedicated semicolons action so combined runs converge on a final form.
    const formatSettings = {
        insertSpaceAfterOpeningAndBeforeClosingNonemptyBraces: false,
    }

    const sourceFiles = selectSourceFiles(project, {absIncludes, absExcludes})
    let changedCount = 0
    let totalCount = 0

    for (const sf of sourceFiles) {
        totalCount++
        const filePath = sf.getFilePath()
        const before = sf.getFullText()
        sf.organizeImports(formatSettings)
        const after = sf.getFullText()
        if (before === after) continue

        changedCount++
        if (dryRun) {
            console.log(`would update: ${filePath}`)
        } else {
            await fs.writeFile(filePath, after)
            console.log(`updated: ${filePath}`)
        }
    }

    const verb = dryRun ? "would change" : "changed"
    console.error(`organize-imports: ${verb} ${changedCount} / ${totalCount} files`)
}
