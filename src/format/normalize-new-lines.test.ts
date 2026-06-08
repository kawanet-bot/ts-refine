import {strict as assert} from "node:assert"
import {describe, it} from "node:test"
import {normalizeNewLines} from "./normalize-new-lines.ts"

describe("normalizeNewLines", () => {
    it("converts mixed LF/CRLF/CR to LF when the target is LF", () => {
        const input = "a\nb\r\nc\rd\n"
        assert.equal(normalizeNewLines(input, "\n"), "a\nb\nc\nd\n")
    })

    it("converts mixed LF/CRLF/CR to CRLF when the target is CRLF", () => {
        const input = "a\nb\r\nc\rd\n"
        assert.equal(normalizeNewLines(input, "\r\n"), "a\r\nb\r\nc\r\nd\r\n")
    })

    it("is idempotent on already-LF input when target is LF", () => {
        assert.equal(normalizeNewLines("x\ny\n", "\n"), "x\ny\n")
    })

    it("is idempotent on already-CRLF input when target is CRLF (no \\r doubling)", () => {
        assert.equal(normalizeNewLines("x\r\ny\r\n", "\r\n"), "x\r\ny\r\n")
    })

    it("leaves non-terminator characters untouched", () => {
        assert.equal(normalizeNewLines("hello world", "\n"), "hello world")
    })
})
