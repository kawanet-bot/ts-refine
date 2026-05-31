import {strict as assert} from "node:assert"
import path from "node:path"
import {describe, it} from "node:test"
import {parseFormat} from "./format-args.ts"

const SAMPLE_TSCONFIG = path.resolve(import.meta.dirname, "../../../sample/basic/tsconfig.json")
const G = {tsconfigPath: SAMPLE_TSCONFIG, dryRun: false}

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
        const r = parseFormat([], G)
        assert.ok(r)
        assert.deepEqual(r.applyOverrides, {})
        assert.equal(r.tsconfigPath, SAMPLE_TSCONFIG)
    })

    it("keeps positional files raw for the runner to resolve", () => {
        const r = parseFormat(["a.ts", "b.ts"], G)
        assert.ok(r)
        assert.deepEqual(r.paths, ["a.ts", "b.ts"])
    })

    it("returns undefined on an unknown option", () => {
        assert.equal(
            quiet(() => parseFormat(["--definitely-not-a-flag"], G)),
            undefined,
        )
    })

    it("rejects --semicolons with an invalid value", () => {
        assert.equal(
            quiet(() => parseFormat(["--semicolons", "yes"], G)),
            undefined,
        )
    })

    it("accepts --semicolons on|off", () => {
        assert.equal(parseFormat(["--semicolons", "on"], G)?.applyOverrides.semicolons, "on")
        assert.equal(parseFormat(["--semicolons", "off"], G)?.applyOverrides.semicolons, "off")
    })

    it("accepts --indent N", () => {
        assert.equal(parseFormat(["--indent", "4"], G)?.applyOverrides.indent, 4)
    })

    it("rejects --indent with a non-positive integer", () => {
        assert.equal(
            quiet(() => parseFormat(["--indent", "0"], G)),
            undefined,
        )
    })

    it("accepts --indent tab for tab indentation", () => {
        assert.equal(parseFormat(["--indent", "tab"], G)?.applyOverrides.indent, "tab")
    })

    it("accepts --new-line lf and --new-line crlf", () => {
        assert.equal(parseFormat(["--new-line", "lf"], G)?.applyOverrides.newLine, "lf")
        assert.equal(parseFormat(["--new-line", "crlf"], G)?.applyOverrides.newLine, "crlf")
    })

    it("rejects --new-line cr (LS formatter cannot emit CR-only)", () => {
        assert.equal(
            quiet(() => parseFormat(["--new-line", "cr"], G)),
            undefined,
        )
    })

    it("accepts --bracket-spacing on|off", () => {
        assert.equal(parseFormat(["--bracket-spacing", "off"], G)?.applyOverrides.bracketSpacing, "off")
    })

    it("accepts --organize-imports on|off", () => {
        assert.equal(parseFormat(["--organize-imports", "off"], G)?.applyOverrides.organizeImports, "off")
    })

    it("rejects bare --organize-imports without an on|off argument", () => {
        assert.equal(
            quiet(() => parseFormat(["--organize-imports"], G)),
            undefined,
        )
    })

    it("passes the dry-run flag through from the globals", () => {
        const r = parseFormat([], {tsconfigPath: SAMPLE_TSCONFIG, dryRun: true})
        assert.ok(r)
        assert.equal(r.dryRun, true)
    })

    it("treats --output as an unknown option", () => {
        assert.equal(
            quiet(() => parseFormat(["--output", "prettier"], G)),
            undefined,
        )
    })
})
