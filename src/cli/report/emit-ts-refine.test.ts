import {strict as assert} from "node:assert"
import {describe, it} from "node:test"
import {getTsRefineFormat, writeFormatMarkdown} from "./emit-ts-refine.ts"

function capture(fn: (s: {write: (chunk: string) => void}) => void): string {
    let out = ""
    fn({write: (s) => (out += s)})
    return out
}

// getTsRefineFormat ignores the writer; the framing (`ts-refine format \`)
// it feeds is covered by select-emitter.test.ts.
const sink = {write: () => {}}

describe("getTsRefineFormat", () => {
    it("maps semicolons.semicolons=off → --semicolons off", () => {
        assert.equal(getTsRefineFormat({semicolons: {semicolons: "off"}}, sink), "--semicolons off")
    })

    it("maps semicolons.semicolons=on → --semicolons on", () => {
        assert.equal(getTsRefineFormat({semicolons: {semicolons: "on"}}, sink), "--semicolons on")
    })

    it("maps indent.width → --indent N", () => {
        assert.equal(getTsRefineFormat({indent: {width: 4}}, sink), "--indent 4")
    })

    it("maps indent.width=tab → --indent tab", () => {
        assert.equal(getTsRefineFormat({indent: {width: "tab"}}, sink), "--indent tab")
    })

    it("omits memberSeparators (report-only; the format command does not consume it)", () => {
        assert.equal(getTsRefineFormat({memberSeparators: {separator: "none"}}, sink), "")
    })

    it("maps newLine.newLine → --new-line V", () => {
        assert.equal(getTsRefineFormat({newLine: {newLine: "lf"}}, sink), "--new-line lf")
    })

    it("maps bracketSpacing.bracketSpacing → --bracket-spacing V", () => {
        assert.equal(getTsRefineFormat({bracketSpacing: {bracketSpacing: "on"}}, sink), "--bracket-spacing on")
    })

    it("combines all recommendations in a fixed order, omitting member-separators", () => {
        const out = getTsRefineFormat(
            // Input keys are intentionally reversed; the output order is fixed.
            {bracketSpacing: {bracketSpacing: "on"}, newLine: {newLine: "lf"}, memberSeparators: {separator: "none"}, indent: {width: 4}, semicolons: {semicolons: "off"}},
            sink,
        )
        assert.equal(out, "--semicolons off --indent 4 --new-line lf --bracket-spacing on")
    })

    it("returns an empty string when nothing was recommended", () => {
        // Symmetric with `--emit prettier` emitting an empty `{}` for the same case.
        assert.equal(getTsRefineFormat({}, sink), "")
    })
})

describe("writeFormatMarkdown", () => {
    it("wraps the command in a `## recommendation` fenced block", () => {
        const out = capture((s) => writeFormatMarkdown({semicolons: {semicolons: "off"}, indent: {width: 4}}, s))
        assert.match(out, /^## recommendation\n\n```sh\nts-refine format \\\n/)
        assert.match(out, /\n {2}--semicolons off --indent 4\n```\n\n$/)
    })

    it("emits nothing when no recommendations fired (no empty ## recommendation block)", () => {
        const out = capture((s) => writeFormatMarkdown({}, s))
        assert.equal(out, "")
    })
})
