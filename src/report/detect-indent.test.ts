import {strict as assert} from "node:assert"
import {describe, it} from "node:test"
import {detectIndent} from "./detect-indent.ts"

describe("detectIndent", () => {
    it("returns the line count for tab-leading lines under `tab`", () => {
        const counts = detectIndent("function f() {\n\treturn 1\n}\n")
        assert.equal(counts.get("tab"), 1)
        assert.equal(counts.size, 1)
    })

    it("counts the diff between consecutive lines, not the absolute leading width", () => {
        // A 2-space file with one nested block: every block transition
        // contributes diff 2; the 4-leading line never appears as key 4.
        const counts = detectIndent(["function f() {", "  a()", "  b()", "  if (x) {", "    return 1", "  }", "}"].join("\n"))
        assert.equal(counts.get(2), 4)
        assert.equal(counts.has(4), false)
        assert.equal(counts.has("tab"), false)
    })

    it("skips ` *` block-comment continuation lines so they do not appear under width 1", () => {
        const counts = detectIndent("/**\n * doc line\n * doc line\n */\nfunction f() {\n    return 1\n}\n")
        // 0→4 and 4→0 each contribute one diff-4 entry.
        assert.equal(counts.get(4), 2)
        assert.equal(counts.has(1), false)
    })

    it("returns an empty map for files with no indented lines", () => {
        const counts = detectIndent("const x = 1\nconst y = 2\n")
        assert.equal(counts.size, 0)
    })
})
