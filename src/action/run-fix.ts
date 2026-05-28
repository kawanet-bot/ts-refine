// `--fix`: unified write-mode entry point. Takes a TsSurveyReport (the
// recommended defaults) plus the CLI's per-field overrides, resolves the
// pair via mergeRecommendations, and applies the result to every matched
// source file through the TypeScript Language Service formatter.
//
// Order matters: formatText first, organizeImports second.
//   - formatText settles indentation, brace spacing, semicolons and the
//     newline character used for any inserted text.
//   - organizeImports then sees an already-formatted file, so its own
//     import block matches the surrounding style without us having to
//     hand it an extra FormatCodeSettings object (which would otherwise
//     duplicate the merged settings or, worse, get auto-detected from
//     pre-format text and drift).
//
// `newLineCharacter` only governs *inserted* line endings; existing
// terminators are not normalized by the LS. When the resolution asks
// for a specific newline, we therefore post-process the final text via
// `normalizeNewLines`.

import type * as declared from "@kawanet/ts-survey"
import fs from "node:fs/promises"

import {mergeRecommendations, normalizeNewLines} from "../lib/merge-recommendations.ts"
import {selectSourceFiles} from "../lib/source-files.ts"

export const runFix: typeof declared.runFix = async (project, opts) => {
    const {dryRun, absIncludes, absExcludes, report, ...overrides} = opts
    const resolved = mergeRecommendations(report, overrides)

    // CR-only recommendations are reported but not applied; surfacing it on
    // stderr keeps the user informed without inventing a fake newline.
    if (resolved.crRecommended) {
        console.error("note: report recommends CR-only newlines; not applied (LS formatter supports LF/CRLF only)")
    }

    // Generated `.d.ts` files are excluded from rewrite — the same scope
    // every report uses for measurement.
    const sourceFiles = selectSourceFiles(project, {absIncludes, absExcludes}).filter((sf) => !sf.getFilePath().endsWith(".d.ts"))

    let changedCount = 0
    let totalCount = 0

    for (const sf of sourceFiles) {
        totalCount++
        const filePath = sf.getFilePath()
        const before = sf.getFullText()

        // Step 1: ask the LS to re-emit the file under the resolved
        // FormatCodeSettings. ts-morph's `formatText` wraps
        // getFormattingEditsForDocument + edit application.
        sf.formatText(resolved.formatSettings)

        // Step 2: organize imports against the already-formatted file.
        // Skipped when --organize-imports off was passed.
        if (resolved.organizeImports) {
            sf.organizeImports()
        }

        // Step 3: normalize line endings if a target was resolved. The LS
        // only uses newLineCharacter for inserted text, so files with
        // pre-existing CRLF/CR terminators need this post-pass.
        let after = sf.getFullText()
        if (resolved.newLineNormalize !== undefined) {
            after = normalizeNewLines(after, resolved.newLineNormalize)
        }

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
    console.error(`fix: ${verb} ${changedCount} / ${totalCount} files`)
}
