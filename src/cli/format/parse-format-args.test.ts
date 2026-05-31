import {strict as assert} from "node:assert"
import {describe, it} from "node:test"
import type {CommonArgs} from "../parse-common-args.ts"
import {parseFormatArgs} from "./parse-format-args.ts"

function common(): CommonArgs {
    return {tsconfigPath: null, dryRun: false, help: false}
}

// Silences the expected stderr writes so the test output stays clean.
function quiet<T>(fn: () => T): T {
    const orig = console.error
    console.error = () => {}
    try {
        return fn()
    } finally {
        console.error = orig
    }
}

describe("parseFormat", () => {
    it("parses an empty override set with no options", () => {
        const r = parseFormatArgs([], common())
        assert.ok(r)
        assert.deepEqual(r.applyOverrides, {})
        assert.deepEqual(r.paths, [])
    })

    it("keeps positional files raw for the runner to resolve", () => {
        const r = parseFormatArgs(["a.ts", "b.ts"], common())
        assert.ok(r)
        assert.deepEqual(r.paths, ["a.ts", "b.ts"])
    })

    it("returns undefined on an unknown option", () => {
        assert.equal(
            quiet(() => parseFormatArgs(["--definitely-not-a-flag"], common())),
            undefined,
        )
    })

    it("rejects --semicolons with an invalid value", () => {
        assert.equal(
            quiet(() => parseFormatArgs(["--semicolons", "yes"], common())),
            undefined,
        )
    })

    it("accepts --semicolons on|off", () => {
        assert.equal(parseFormatArgs(["--semicolons", "on"], common())?.applyOverrides.semicolons, "on")
        assert.equal(parseFormatArgs(["--semicolons", "off"], common())?.applyOverrides.semicolons, "off")
    })

    it("accepts --indent N", () => {
        assert.equal(parseFormatArgs(["--indent", "4"], common())?.applyOverrides.indent, 4)
    })

    it("rejects --indent with a non-positive integer", () => {
        assert.equal(
            quiet(() => parseFormatArgs(["--indent", "0"], common())),
            undefined,
        )
    })

    it("accepts --indent tab for tab indentation", () => {
        assert.equal(parseFormatArgs(["--indent", "tab"], common())?.applyOverrides.indent, "tab")
    })

    it("accepts --new-line lf and --new-line crlf", () => {
        assert.equal(parseFormatArgs(["--new-line", "lf"], common())?.applyOverrides.newLine, "lf")
        assert.equal(parseFormatArgs(["--new-line", "crlf"], common())?.applyOverrides.newLine, "crlf")
    })

    it("rejects --new-line cr (LS formatter cannot emit CR-only)", () => {
        assert.equal(
            quiet(() => parseFormatArgs(["--new-line", "cr"], common())),
            undefined,
        )
    })

    it("accepts --bracket-spacing on|off", () => {
        assert.equal(parseFormatArgs(["--bracket-spacing", "off"], common())?.applyOverrides.bracketSpacing, "off")
    })

    it("accepts --organize-imports on|off", () => {
        assert.equal(parseFormatArgs(["--organize-imports", "off"], common())?.applyOverrides.organizeImports, "off")
    })

    it("rejects bare --organize-imports without an on|off argument", () => {
        assert.equal(
            quiet(() => parseFormatArgs(["--organize-imports"], common())),
            undefined,
        )
    })

    it("consumes a trailing --dry-run into the common args", () => {
        const c = common()
        assert.ok(parseFormatArgs(["--dry-run"], c))
        assert.equal(c.dryRun, true)
    })

    it("consumes a trailing -p into the common args", () => {
        const c = common()
        assert.ok(parseFormatArgs(["-p", "tsconfig.json"], c))
        assert.equal(c.tsconfigPath, "tsconfig.json")
    })

    it("treats --output as an unknown option", () => {
        assert.equal(
            quiet(() => parseFormatArgs(["--output", "prettier"], common())),
            undefined,
        )
    })
})
