// Type-only fixes ride the organize-imports bundle. Under verbatimModuleSyntax
// the three LS code fixes rewrite mixed import/export declarations; a project
// without it must see no type-only change at all.

import {strict as assert} from "node:assert"
import path from "node:path"
import {describe, it} from "node:test"
import {Project} from "ts-morph"
import {applyTypeOnlyFixes} from "../lib/type-only-fixes.ts"
import {refineFormat} from "./refine-format.ts"

const VERBATIM_TSCONFIG = path.resolve(import.meta.dirname, "../../sample/type-only-mixed/tsconfig.json")
const BASIC_TSCONFIG = path.resolve(import.meta.dirname, "../../sample/basic/tsconfig.json")

function read(project: Project, rel: string): string {
    const abs = path.resolve(path.dirname(VERBATIM_TSCONFIG), rel)
    return project.getSourceFile(abs)!.getFullText()
}

describe("applyTypeOnlyFixes via refineFormat (verbatimModuleSyntax on)", () => {
    it("fires all three fixes end-to-end without touching disk", async () => {
        const project = new Project({tsConfigFilePath: VERBATIM_TSCONFIG})

        await refineFormat(project, {dryRun: true, paths: [], report: {}})

        // convertToTypeOnlyImport: Shape gets an inline `type` marker.
        const consume = read(project, "src/consume.ts")
        assert.match(consume, /import\s*\{\s*type Shape,\s*VERSION\s*\}/, `consume: ${consume}`)

        // convertToTypeOnlyExport: the mixed re-export splits, Shape becomes a
        // `export type` while VERSION stays a value export.
        const reexport = read(project, "src/reexport.ts")
        assert.match(reexport, /export type\s*\{\s*Shape\s*\}/, `reexport: ${reexport}`)
        assert.match(reexport, /export\s*\{\s*VERSION\s*\}/, `reexport: ${reexport}`)

        // splitTypeOnlyImport: the illegal default+named type-only import is
        // split into two declarations.
        const split = read(project, "src/split.ts")
        assert.match(split, /import type Registry/, `split: ${split}`)
        assert.match(split, /import type\s*\{\s*Shape\s*\}/, `split: ${split}`)
    })
})

describe("applyTypeOnlyFixes (no verbatimModuleSyntax)", () => {
    it("is a no-op when no type-only diagnostic fires", () => {
        const project = new Project({tsConfigFilePath: BASIC_TSCONFIG})
        for (const sf of project.getSourceFiles()) {
            const before = sf.getFullText()
            applyTypeOnlyFixes(sf, {})
            assert.equal(sf.getFullText(), before, `expected no-op on ${sf.getBaseName()}`)
        }
    })
})
