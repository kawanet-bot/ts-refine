import {strict as assert} from "node:assert"
import {describe, it} from "node:test"
import {writeTsSurveyCommand, writeTsSurveyMarkdown} from "./format-ts-survey.ts"

function capture(fn: (s: {write: (chunk: string) => void}) => void): string {
    let out = ""
    fn({write: (s) => (out += s)})
    return out
}

describe("writeTsSurveyCommand", () => {
    it("maps semicolons.mode=remove → --remove-semicolons", () => {
        const out = capture((s) => writeTsSurveyCommand({semicolons: {mode: "remove"}}, s))
        assert.equal(out, "ts-survey \\\n  --remove-semicolons\n")
    })

    it("maps semicolons.mode=insert → --insert-semicolons", () => {
        const out = capture((s) => writeTsSurveyCommand({semicolons: {mode: "insert"}}, s))
        assert.equal(out, "ts-survey \\\n  --insert-semicolons\n")
    })

    it("maps indent.width → --indent N", () => {
        const out = capture((s) => writeTsSurveyCommand({indent: {width: 4}}, s))
        assert.equal(out, "ts-survey \\\n  --indent 4\n")
    })

    it("maps memberSeparators.separator → --member-separator V", () => {
        const out = capture((s) => writeTsSurveyCommand({memberSeparators: {separator: "none"}}, s))
        assert.equal(out, "ts-survey \\\n  --member-separator none\n")
    })

    it("maps newLine.newLine → --new-line V", () => {
        const out = capture((s) => writeTsSurveyCommand({newLine: {newLine: "lf"}}, s))
        assert.equal(out, "ts-survey \\\n  --new-line lf\n")
    })

    it("combines all recommendations in a fixed order", () => {
        const out = capture((s) =>
            writeTsSurveyCommand(
                // Input keys are intentionally reversed; the output order is fixed.
                {newLine: {newLine: "lf"}, memberSeparators: {separator: "none"}, indent: {width: 4}, semicolons: {mode: "remove"}},
                s,
            ),
        )
        assert.equal(out, "ts-survey \\\n  --remove-semicolons --indent 4 --member-separator none --new-line lf\n")
    })

    it("emits a bare `ts-survey` when nothing was recommended", () => {
        // Symmetric with `--format prettier` emitting an empty `{}` for the same case.
        const out = capture((s) => writeTsSurveyCommand({}, s))
        assert.equal(out, "ts-survey\n")
    })

    it("keeps the args on a separate line so `grep '^ +--'` extracts flags only", () => {
        const out = capture((s) => writeTsSurveyCommand({semicolons: {mode: "remove"}}, s))
        const second = out.split("\n")[1]
        assert.match(second, /^ +--/)
    })
})

describe("writeTsSurveyMarkdown", () => {
    it("wraps the command in a `## recommendation` fenced block", () => {
        const out = capture((s) => writeTsSurveyMarkdown({semicolons: {mode: "remove"}, indent: {width: 4}}, s))
        assert.match(out, /^## recommendation\n\n```sh\nts-survey \\\n/)
        assert.match(out, /\n {2}--remove-semicolons --indent 4\n```\n\n$/)
    })

    it("emits nothing when no recommendations fired (no empty ## recommendation block)", () => {
        const out = capture((s) => writeTsSurveyMarkdown({}, s))
        assert.equal(out, "")
    })
})
