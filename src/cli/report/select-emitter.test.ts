import {strict as assert} from "node:assert"
import {describe, it} from "node:test"
import type {TSR} from "ts-refine"
import {selectEmitter} from "./select-emitter.ts"

function makeStdout(): {writer: TSR.Writer; out: () => string} {
    let out = ""
    return {writer: {write: (s) => (out += s)}, out: () => out}
}

describe("selectOutput", () => {
    it("returns a no-op finalize and the stdout stream when no output is selected", () => {
        const {writer, out} = makeStdout()
        const f = selectEmitter(null, writer)
        assert.equal(f.reportStream, writer)
        f.finalize({semi: {semi: "off"}})
        assert.equal(out(), "")
    })

    it("leaves the report stream unset and writes prettier JSON on finalize", () => {
        const {writer, out} = makeStdout()
        const f = selectEmitter("prettier", writer)

        // No report stream: refineReport skips the Markdown body entirely.
        assert.equal(f.reportStream, undefined)
        f.finalize({semi: {semi: "off"}, indent: {width: 4}})
        const json = JSON.parse(out())
        assert.equal(json.semi, false)
        assert.equal(json.tabWidth, 4)
        assert.equal(json.useTabs, false)
    })

    it("leaves the report stream unset and writes the format command on finalize", () => {
        const {writer, out} = makeStdout()
        const f = selectEmitter("ts-refine", writer)
        assert.equal(f.reportStream, undefined)
        f.finalize({semi: {semi: "off"}, indent: {width: 4}, memberDelimiter: {delimiter: "comma"}})

        // Single-line form: just the `format` flags (no leading `ts-refine format`),
        // suitable for embedding (e.g. in headings) or passing to `ts-refine format`.
        assert.equal(out(), "--semi off --indent 4 --member-delimiter comma\n")
    })

    it("leaves the report stream unset and writes stylistic JSON on finalize", () => {
        const {writer, out} = makeStdout()
        const f = selectEmitter("stylistic", writer)
        assert.equal(f.reportStream, undefined)
        f.finalize({semi: {semi: "off"}, indent: {width: 4}})

        const json = JSON.parse(out())
        assert.deepEqual(json.rules["@stylistic/semi"], ["error", "never"])
        assert.deepEqual(json.rules["@stylistic/indent"], ["error", 4])
    })

    it("throws on an unknown output name", () => {
        const {writer} = makeStdout()
        assert.throws(() => selectEmitter("typo-format", writer), /unknown --emit: typo-format \(known: prettier, ts-refine, stylistic\)/)
    })
})
