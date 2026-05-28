import {strict as assert} from "node:assert"
import {describe, it} from "node:test"
import {detectIndent} from "./detect-indent.ts"

describe("detectIndent", () => {
    it("classifies a tab-indented file as `tab`", () => {
        const r = detectIndent("function f() {\n\treturn 1\n}\n")
        assert.equal(r?.unit, "tab")
    })

    it("returns 2 for a uniformly 2-space file", () => {
        const r = detectIndent("function f() {\n  if (x) {\n    return 1\n  }\n}\n")
        assert.equal(r?.unit, 2)
    })

    it("returns 4 for a uniformly 4-space file", () => {
        const r = detectIndent("function f() {\n    if (x) {\n        return 1\n    }\n}\n")
        assert.equal(r?.unit, 4)
    })

    it("ignores ` *` block-comment continuation lines", () => {
        const text = "/**\n * doc line\n * doc line\n */\nfunction f() {\n    return 1\n}\n"
        assert.equal(detectIndent(text)?.unit, 4)
    })

    it("returns null for files with no indented lines", () => {
        assert.equal(detectIndent("const x = 1\nconst y = 2\n"), null)
    })
})
