import {strict as assert} from "node:assert"
import {describe, it} from "node:test"
import {hasLineBreakBetween} from "./text-ranges.ts"

describe("hasLineBreakBetween", () => {
    it("detects LF and CR line breaks inside the requested range", () => {
        assert.equal(hasLineBreakBetween("a\nb", 0, 2), true)
        assert.equal(hasLineBreakBetween("a\rb", 0, 2), true)
        assert.equal(hasLineBreakBetween("a\nb", 0, 1), false)
    })

    it("returns false for empty or reversed ranges without scanning forward", () => {
        assert.equal(hasLineBreakBetween("a\nb", 1, 1), false)
        assert.equal(hasLineBreakBetween("a\nb", 2, 1), false)
    })
})
