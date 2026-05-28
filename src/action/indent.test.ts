// Reuses the original indent-action coverage against the unified
// runFix entry point. Each it block exercises `runFix({indent: N})`
// instead of the retired `runIndent`; the assertions are preserved.

import {strict as assert} from "node:assert"
import {describe, it} from "node:test"
import {Project} from "ts-morph"

import type {RunFixOpts, TsSurveyReport} from "@kawanet/ts-survey"
import {runFix} from "./run-fix.ts"

// Builds RunFixOpts with the indent override pinned and unrelated
// passes (organize-imports) silenced so the test exercises only the
// indent dimension.
function opts(width: number): Omit<RunFixOpts, "report"> & {report: TsSurveyReport} {
    return {dryRun: true, absIncludes: [], absExcludes: [], indent: width, organizeImports: "off", report: {}}
}

describe("runFix --indent (dry-run, in-memory)", () => {
    it("expands 2-space indent to 4-space", async () => {
        const project = new Project({useInMemoryFileSystem: true})
        const sf = project.createSourceFile("a.ts", ["function f() {", "  return 1", "}", ""].join("\n"))
        await runFix(project, opts(4))
        assert.match(sf.getFullText(), /\n {4}return 1\n/)
    })

    it("expands a single leading tab to width spaces", async () => {
        const project = new Project({useInMemoryFileSystem: true})
        const sf = project.createSourceFile("b.ts", ["function f() {", "\treturn 1", "}", ""].join("\n"))
        await runFix(project, opts(4))
        assert.match(sf.getFullText(), /\n {4}return 1\n/)
    })

    it("does not rewrite indent inside a template literal", async () => {
        const project = new Project({useInMemoryFileSystem: true})
        const sf = project.createSourceFile("c.ts", ["function f() {", "  const s = `", "    indented inside template", "    other inside template", "  `", "  return s", "}", ""].join("\n"))
        await runFix(project, opts(4))
        const lines = sf.getFullText().split("\n")
        // Code lines (outside template) are rewritten to 4-space.
        assert.equal(lines[0], "function f() {")
        assert.equal(lines[1], "    const s = `")
        assert.equal(lines[5], "    return s")
        assert.equal(lines[6], "}")
        // Template-content lines retain their original leading whitespace
        // because their first character sits inside the template span.
        assert.equal(lines[2], "    indented inside template")
        assert.equal(lines[3], "    other inside template")
        assert.equal(lines[4], "  `")
    })

    it("leaves JSDoc continuation lines (` * ...`) alone", async () => {
        const project = new Project({useInMemoryFileSystem: true})
        const sf = project.createSourceFile("d.ts", ["/**", " * docs", " */", "function f() {", "  return 1", "}", ""].join("\n"))
        await runFix(project, opts(4))
        const text = sf.getFullText()
        assert.match(text, /\n \* docs\n/)
        assert.match(text, /\n {4}return 1\n/)
    })

    it("is a no-op when the source already matches the target", async () => {
        const project = new Project({useInMemoryFileSystem: true})
        const sf = project.createSourceFile("e.ts", ["function f() {", "    return 1", "}", ""].join("\n"))
        const before = sf.getFullText()
        await runFix(project, opts(4))
        assert.equal(sf.getFullText(), before)
    })

    it("normalizes binary-operator continuation lines to the parent block's indent level", async () => {
        const project = new Project({useInMemoryFileSystem: true})
        // The old hand-rolled rewriter preserved a 5-space binary-operator
        // alignment unchanged ("skip non-multiples of the unit"). The LS
        // formatter does not preserve hand-rolled alignment — it re-indents
        // the continuation to the parent block's level + the configured
        // continuation indent. The test pins the LS outcome so we notice
        // a future change either way; Prettier behaves identically.
        const sf = project.createSourceFile("f.ts", ["function f() {", "  const x = 1 +", "     2", "}", ""].join("\n"))
        await runFix(project, opts(4))
        const lines = sf.getFullText().split("\n")
        assert.equal(lines[1], "    const x = 1 +")
        // Two indent levels: one for the function body, one for the
        // binary-operator continuation. Original 5-space alignment is lost.
        assert.equal(lines[2], "        2")
    })
})
