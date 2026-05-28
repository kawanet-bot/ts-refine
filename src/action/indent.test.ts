import type {RunIndentOpts} from "@kawanet/ts-survey"
import {strict as assert} from "node:assert"
import {describe, it} from "node:test"
import {Project} from "ts-morph"
import {runIndent} from "./indent.ts"

const opts = (width: number): RunIndentOpts => ({dryRun: true, absIncludes: [], absExcludes: [], width})

describe("runIndent (dry-run, in-memory)", () => {
    it("expands 2-space indent to 4-space", async () => {
        const project = new Project({useInMemoryFileSystem: true})
        const sf = project.createSourceFile("a.ts", ["function f() {", "  return 1", "}", ""].join("\n"))
        await runIndent(project, opts(4))
        assert.match(sf.getFullText(), /\n {4}return 1\n/)
    })

    it("expands a single leading tab to width spaces", async () => {
        const project = new Project({useInMemoryFileSystem: true})
        const sf = project.createSourceFile("b.ts", ["function f() {", "\treturn 1", "}", ""].join("\n"))
        await runIndent(project, opts(4))
        assert.match(sf.getFullText(), /\n {4}return 1\n/)
    })

    it("does not rewrite indent inside a template literal", async () => {
        const project = new Project({useInMemoryFileSystem: true})
        const sf = project.createSourceFile("c.ts", ["function f() {", "  const s = `", "    indented inside template", "    other inside template", "  `", "  return s", "}", ""].join("\n"))
        await runIndent(project, opts(4))
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
        await runIndent(project, opts(4))
        const text = sf.getFullText()
        assert.match(text, /\n \* docs\n/)
        assert.match(text, /\n {4}return 1\n/)
    })

    it("is a no-op when the source already matches the target", async () => {
        const project = new Project({useInMemoryFileSystem: true})
        const sf = project.createSourceFile("e.ts", ["function f() {", "    return 1", "}", ""].join("\n"))
        const before = sf.getFullText()
        await runIndent(project, opts(4))
        assert.equal(sf.getFullText(), before)
    })

    it("skips alignment-style continuation indents that are not multiples of the unit", async () => {
        const project = new Project({useInMemoryFileSystem: true})
        // The 3-space continuation between the 2-space-unit `const` and `+`
        // is alignment, not an indent level. It must survive untouched while
        // the surrounding 2-space indent is rewritten to 4-space.
        const sf = project.createSourceFile("f.ts", ["function f() {", "  const x = 1 +", "     2", "}", ""].join("\n"))
        await runIndent(project, opts(4))
        const lines = sf.getFullText().split("\n")
        assert.equal(lines[1], "    const x = 1 +")
        assert.equal(lines[2], "     2") // 5 spaces preserved
    })
})
