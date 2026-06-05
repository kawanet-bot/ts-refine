import {strict as assert} from "node:assert"
import {describe, it} from "node:test"
import type {TSR} from "../../../types/ts-refine"
import {mergeFormatStyles, reportNamesForFormat} from "./format-options.ts"

describe("mergeFormatStyles", () => {
    it("lets the override win per field, falling back to the base", () => {
        const merged = mergeFormatStyles({semi: "on", indent: 2}, {indent: 4})
        assert.equal(merged.semi, "on")
        assert.equal(merged.indent, 4)
    })

    it("leaves a field unset when neither side speaks", () => {
        assert.equal(mergeFormatStyles({}, {}).bracketSpacing, undefined)
    })
})

describe("reportNamesForFormat", () => {
    it("surveys the full apply set when nothing is overridden", () => {
        assert.deepEqual(reportNamesForFormat({}), ["semi", "indent", "member-delimiter", "new-line", "bracket-spacing", "trailing-comma"])
    })

    it("drops the report for each pinned field", () => {
        assert.deepEqual(reportNamesForFormat({indent: 4}), ["semi", "member-delimiter", "new-line", "bracket-spacing", "trailing-comma"])
        assert.deepEqual(reportNamesForFormat({newLine: "lf"}), ["semi", "indent", "member-delimiter", "bracket-spacing", "trailing-comma"])
        assert.deepEqual(reportNamesForFormat({memberDelimiter: "semi"}), ["semi", "indent", "new-line", "bracket-spacing", "trailing-comma"])
        assert.deepEqual(reportNamesForFormat({trailingComma: "on"}), ["semi", "indent", "member-delimiter", "new-line", "bracket-spacing"])
    })

    it("returns an empty set when every surveyed field is pinned", () => {
        const all: TSR.FormatStyle = {semi: "on", indent: 2, memberDelimiter: "semi", newLine: "lf", bracketSpacing: "off", trailingComma: "on"}
        assert.deepEqual(reportNamesForFormat(all), [])
    })
})
