import {strict as assert} from "node:assert"
import {describe, it} from "node:test"
import {emitStylisticConfig, getStylisticConfig} from "./emit-stylistic.ts"

function capture(report: Parameters<typeof getStylisticConfig>[0]): string {
    return getStylisticConfig(report)
}

describe("getStylisticConfig", () => {
    it("renders an empty rules object when nothing was recommended", () => {
        assert.deepEqual(JSON.parse(capture({})), {rules: {}})
    })

    it("maps format reports to @stylistic rule entries", () => {
        const json = JSON.parse(
            capture({
                semi: {semi: "off"},
                indent: {width: 4},
                memberDelimiter: {delimiter: "semi"},
                newLine: {newLine: "lf"},
                bracketSpacing: {bracketSpacing: "off"},
                trailingComma: {trailingComma: "on"},
            }),
        )

        assert.deepEqual(json.rules["@stylistic/semi"], ["error", "never"])
        assert.deepEqual(json.rules["@stylistic/indent"], ["error", 4])
        assert.deepEqual(json.rules["@stylistic/linebreak-style"], ["error", "unix"])
        assert.deepEqual(json.rules["@stylistic/object-curly-spacing"], ["error", "never"])
        assert.deepEqual(json.rules["@stylistic/comma-dangle"], ["error", "always-multiline"])
        assert.deepEqual(json.rules["@stylistic/member-delimiter-style"], [
            "error",
            {
                multiline: {delimiter: "semi", requireLast: true},
                singleline: {delimiter: "semi", requireLast: true},
            },
        ])
    })

    it("maps on/off and tab variants", () => {
        const json = JSON.parse(capture({semi: {semi: "on"}, indent: {width: "tab"}, newLine: {newLine: "crlf"}, bracketSpacing: {bracketSpacing: "on"}, trailingComma: {trailingComma: "off"}}))
        assert.deepEqual(json.rules["@stylistic/semi"], ["error", "always"])
        assert.deepEqual(json.rules["@stylistic/indent"], ["error", "tab"])
        assert.deepEqual(json.rules["@stylistic/linebreak-style"], ["error", "windows"])
        assert.deepEqual(json.rules["@stylistic/object-curly-spacing"], ["error", "always"])
        assert.deepEqual(json.rules["@stylistic/comma-dangle"], ["error", "never"])
    })

    it("skips CR-only new-line reports because stylistic has no equivalent", () => {
        const json = JSON.parse(capture({newLine: {newLine: "cr"}}))
        assert.deepEqual(json.rules, {})
    })

    it("uses a legal singleline delimiter when member delimiter is none", () => {
        const json = JSON.parse(capture({memberDelimiter: {delimiter: "none"}}))
        assert.deepEqual(json.rules["@stylistic/member-delimiter-style"], [
            "error",
            {
                multiline: {delimiter: "none", requireLast: true},
                singleline: {delimiter: "semi", requireLast: false},
            },
        ])
    })

    it("keeps rule arrays compact in the JSON output", () => {
        const out = capture({semi: {semi: "off"}, indent: {width: 2}})
        assert.match(out, /"@stylistic\/semi": \["error", "never"\]/)
        assert.match(out, /"@stylistic\/indent": \["error", 2\]/)
    })
})

describe("emitStylisticConfig", () => {
    it("writes the config with one trailing newline", () => {
        let out = ""
        emitStylisticConfig({semi: {semi: "off"}}, {write: (s) => (out += s)})
        assert.match(out, /\n$/)
        assert.equal(JSON.parse(out).rules["@stylistic/semi"][1], "never")
    })
})
