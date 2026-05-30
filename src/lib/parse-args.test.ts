import {strict as assert} from "node:assert"
import path from "node:path"
import {describe, it} from "node:test"
import {parseArgs} from "./parse-args.ts"

const SAMPLE_TSCONFIG = path.resolve(import.meta.dirname, "../../sample/basic/tsconfig.json")
const SAMPLE_DIR = path.dirname(SAMPLE_TSCONFIG)

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

describe("parseArgs", () => {
    it("treats `format` as the write mode and feeds the format report set", () => {
        const r = parseArgs(["format", "-p", SAMPLE_TSCONFIG])
        assert.ok(r && !("help" in r))
        assert.equal(r.command, "format")
        assert.deepEqual(r.applyOverrides, {})
        assert.ok(r.reportNames.includes("semicolons"))
    })

    it("collects report-name selector flags with de-duplication", () => {
        const r = parseArgs(["report", "--unused-exports", "--semicolons", "--unused-exports", "-p", SAMPLE_TSCONFIG])
        assert.ok(r && !("help" in r))
        assert.equal(r.command, "report")
        assert.deepEqual(r.reportNames, ["unused-exports", "semicolons"])
    })

    it("passes unknown report selectors through without rejecting (runReports validates)", () => {
        const r = parseArgs(["report", "--typo-name", "-p", SAMPLE_TSCONFIG])
        assert.ok(r && !("help" in r))
        assert.deepEqual(r.reportNames, ["typo-name"])
    })

    it("passes unknown --output names through without rejecting (selectOutput validates)", () => {
        const r = parseArgs(["report", "--output", "typo-format", "-p", SAMPLE_TSCONFIG])
        assert.ok(r && !("help" in r))
        assert.equal(r.output, "typo-format")
    })

    it("accepts report selectors alongside --output", () => {
        const r = parseArgs(["report", "--semicolons", "--output", "ts-refine", "-p", SAMPLE_TSCONFIG])
        assert.ok(r && !("help" in r))
        assert.deepEqual(r.reportNames, ["semicolons"])
        assert.equal(r.output, "ts-refine")
        assert.equal(r.surveyDefault, false)
    })

    it("resolves positional file globs against the tsconfig directory", () => {
        const r = parseArgs(["report", "-p", SAMPLE_TSCONFIG, "src/**", "extra.ts"])
        assert.ok(r && !("help" in r))
        assert.deepEqual(r.paths, [path.join(SAMPLE_DIR, "src/**"), path.join(SAMPLE_DIR, "extra.ts")])
    })

    it("accepts positional files under format", () => {
        const r = parseArgs(["format", "-p", SAMPLE_TSCONFIG, "a.ts", "b.ts"])
        assert.ok(r && !("help" in r))
        assert.deepEqual(r.paths, [path.join(SAMPLE_DIR, "a.ts"), path.join(SAMPLE_DIR, "b.ts")])
    })

    it("defaults tsconfigPath to ./tsconfig.json when none is given", () => {
        const r = parseArgs(["format"])
        assert.ok(r && !("help" in r))
        assert.equal(r.tsconfigPath, path.resolve("tsconfig.json"))
    })

    it("accepts -p with a tsconfig.json path", () => {
        const r = parseArgs(["report", "-p", SAMPLE_TSCONFIG])
        assert.ok(r && !("help" in r))
        assert.equal(r.tsconfigPath, SAMPLE_TSCONFIG)
    })

    it("accepts --project as the long form of -p", () => {
        const r = parseArgs(["report", "--project", SAMPLE_TSCONFIG])
        assert.ok(r && !("help" in r))
        assert.equal(r.tsconfigPath, SAMPLE_TSCONFIG)
    })

    it("treats a non-.json -p value as a directory and appends tsconfig.json", () => {
        const r = parseArgs(["report", "-p", SAMPLE_DIR])
        assert.ok(r && !("help" in r))
        assert.equal(r.tsconfigPath, path.join(SAMPLE_DIR, "tsconfig.json"))
    })

    it("treats `-p .` the same as omitting the path", () => {
        const r = parseArgs(["report", "-p", "."])
        assert.ok(r && !("help" in r))
        assert.equal(r.tsconfigPath, path.resolve("tsconfig.json"))
    })

    it("returns {help: true} on help, -h, --help, and no args", () => {
        assert.deepEqual(parseArgs(["help"]), {help: true})
        assert.deepEqual(parseArgs(["--help"]), {help: true})
        assert.deepEqual(parseArgs(["-h"]), {help: true})
        assert.deepEqual(parseArgs([]), {help: true})
    })

    it("treats -h / --help as help even after a subcommand", () => {
        assert.deepEqual(parseArgs(["report", "--help"]), {help: true})
        assert.deepEqual(parseArgs(["format", "-h"]), {help: true})
    })

    it("runs every registered report under a bare `report` (survey default)", () => {
        const r = parseArgs(["report"])
        assert.ok(r && !("help" in r))
        assert.equal(r.command, "report")
        // Survey-style default: every report in the registry runs.
        assert.ok(r.reportNames.includes("semicolons"))
        assert.ok(r.reportNames.includes("bracket-spacing"))
        assert.equal(r.surveyDefault, true)
    })

    it("runs every recommendation-bearing report under `format`", () => {
        const r = parseArgs(["format"])
        assert.ok(r && !("help" in r))
        // surveyDefault gates the recommendation Markdown blocks only.
        assert.equal(r.surveyDefault, false)
        assert.ok(r.reportNames.includes("semicolons"))
        assert.ok(r.reportNames.includes("bracket-spacing"))
    })

    it("opts out of the survey-default flag when selectors or --output are given", () => {
        const r1 = parseArgs(["report", "--unused-exports", "-p", SAMPLE_TSCONFIG])
        assert.ok(r1 && !("help" in r1))
        assert.equal(r1.surveyDefault, false)
        const r2 = parseArgs(["report", "--output", "prettier", "-p", SAMPLE_TSCONFIG])
        assert.ok(r2 && !("help" in r2))
        assert.equal(r2.surveyDefault, false)
    })

    it("returns undefined on an unknown command", () => {
        const r = quiet(() => parseArgs(["frobnicate", "-p", SAMPLE_TSCONFIG]))
        assert.equal(r, undefined)
    })

    it("returns undefined on an unknown format option", () => {
        const r = quiet(() => parseArgs(["format", "--definitely-not-a-flag", "-p", SAMPLE_TSCONFIG]))
        assert.equal(r, undefined)
    })

    it("returns undefined on a stray single-dash option under report", () => {
        const r = quiet(() => parseArgs(["report", "-z", "-p", SAMPLE_TSCONFIG]))
        assert.equal(r, undefined)
    })

    it("returns undefined when options are given without a subcommand", () => {
        const r = quiet(() => parseArgs(["--output", "prettier", "-p", SAMPLE_TSCONFIG]))
        assert.equal(r, undefined)
    })

    it("rejects --semicolons with an invalid value", () => {
        const r = quiet(() => parseArgs(["format", "--semicolons", "yes", "-p", SAMPLE_TSCONFIG]))
        assert.equal(r, undefined)
    })

    it("accepts --semicolons on|off under format", () => {
        const on = parseArgs(["format", "--semicolons", "on", "-p", SAMPLE_TSCONFIG])
        assert.ok(on && !("help" in on))
        assert.equal(on.command, "format")
        assert.equal(on.applyOverrides.semicolons, "on")
        const off = parseArgs(["format", "--semicolons", "off", "-p", SAMPLE_TSCONFIG])
        assert.ok(off && !("help" in off))
        assert.equal(off.applyOverrides.semicolons, "off")
    })

    it("accepts --indent N under format", () => {
        const r = parseArgs(["format", "--indent", "4", "-p", SAMPLE_TSCONFIG])
        assert.ok(r && !("help" in r))
        assert.equal(r.command, "format")
        assert.equal(r.applyOverrides.indent, 4)
    })

    it("rejects --indent with a non-positive integer", () => {
        const r = quiet(() => parseArgs(["format", "--indent", "0", "-p", SAMPLE_TSCONFIG]))
        assert.equal(r, undefined)
    })

    it("accepts --indent tab for tab indentation under format", () => {
        const r = parseArgs(["format", "--indent", "tab", "-p", SAMPLE_TSCONFIG])
        assert.ok(r && !("help" in r))
        assert.equal(r.applyOverrides.indent, "tab")
    })

    it("accepts --new-line lf and --new-line crlf", () => {
        const r1 = parseArgs(["format", "--new-line", "lf", "-p", SAMPLE_TSCONFIG])
        assert.ok(r1 && !("help" in r1))
        assert.equal(r1.applyOverrides.newLine, "lf")
        const r2 = parseArgs(["format", "--new-line", "crlf", "-p", SAMPLE_TSCONFIG])
        assert.ok(r2 && !("help" in r2))
        assert.equal(r2.applyOverrides.newLine, "crlf")
    })

    it("rejects --new-line cr (LS formatter cannot emit CR-only)", () => {
        const r = quiet(() => parseArgs(["format", "--new-line", "cr", "-p", SAMPLE_TSCONFIG]))
        assert.equal(r, undefined)
    })

    it("accepts --bracket-spacing on|off", () => {
        const r = parseArgs(["format", "--bracket-spacing", "off", "-p", SAMPLE_TSCONFIG])
        assert.ok(r && !("help" in r))
        assert.equal(r.applyOverrides.bracketSpacing, "off")
    })

    it("accepts --organize-imports on|off under format", () => {
        const r = parseArgs(["format", "--organize-imports", "off", "-p", SAMPLE_TSCONFIG])
        assert.ok(r && !("help" in r))
        assert.equal(r.command, "format")
        assert.equal(r.applyOverrides.organizeImports, "off")
    })

    it("rejects bare --organize-imports without an on|off argument", () => {
        const r = quiet(() => parseArgs(["format", "--organize-imports", "-p", SAMPLE_TSCONFIG]))
        assert.equal(r, undefined)
    })

    it("accepts --dry-run under format", () => {
        const r = parseArgs(["format", "--dry-run", "-p", SAMPLE_TSCONFIG])
        assert.ok(r && !("help" in r))
        assert.equal(r.dryRun, true)
    })

    it("treats --output as an unknown option under format", () => {
        const r = quiet(() => parseArgs(["format", "--output", "prettier", "-p", SAMPLE_TSCONFIG]))
        assert.equal(r, undefined)
    })

    it("parses `list` with no filters", () => {
        const r = parseArgs(["list", "-p", SAMPLE_TSCONFIG])
        assert.ok(r && !("help" in r))
        assert.equal(r.command, "list")
        assert.deepEqual(r.listFilters, {noExports: false, noImporters: false, unusedExports: false})
    })

    it("parses the `list` filter flags", () => {
        const r = parseArgs(["list", "--no-exports", "--unused-exports", "-p", SAMPLE_TSCONFIG])
        assert.ok(r && !("help" in r))
        assert.deepEqual(r.listFilters, {noExports: true, noImporters: false, unusedExports: true})
    })

    it("accepts positional files under list", () => {
        const r = parseArgs(["list", "-p", SAMPLE_TSCONFIG, "a.ts"])
        assert.ok(r && !("help" in r))
        assert.deepEqual(r.paths, [path.join(SAMPLE_DIR, "a.ts")])
    })

    it("returns undefined on an unknown list option", () => {
        const r = quiet(() => parseArgs(["list", "--bogus", "-p", SAMPLE_TSCONFIG]))
        assert.equal(r, undefined)
    })

    it("defaults `inspect` to the full inspector registry", () => {
        const r = parseArgs(["inspect", "-p", SAMPLE_TSCONFIG])
        assert.ok(r && !("help" in r))
        assert.equal(r.command, "inspect")
        assert.deepEqual(r.inspectorNames, ["exports", "importers"])
    })

    it("collects inspector selectors and dedupes", () => {
        const r = parseArgs(["inspect", "--exports", "--importers", "--exports", "-p", SAMPLE_TSCONFIG])
        assert.ok(r && !("help" in r))
        assert.deepEqual(r.inspectorNames, ["exports", "importers"])
    })

    it("passes unknown inspector selectors through (runInspect validates)", () => {
        const r = parseArgs(["inspect", "--typo", "-p", SAMPLE_TSCONFIG])
        assert.ok(r && !("help" in r))
        assert.deepEqual(r.inspectorNames, ["typo"])
    })

    it("accepts positional files under inspect", () => {
        const r = parseArgs(["inspect", "-p", SAMPLE_TSCONFIG, "a.ts"])
        assert.ok(r && !("help" in r))
        assert.deepEqual(r.paths, [path.join(SAMPLE_DIR, "a.ts")])
    })

    it("parses `move` positionals as a flat path list (split happens at dispatch)", () => {
        const r = parseArgs(["move", "a.ts", "b.ts", "dest/", "-p", SAMPLE_TSCONFIG])
        assert.ok(r && !("help" in r))
        assert.equal(r.command, "move")
        // resolvePaths preserves the trailing `/` so dispatch can detect a directory dest.
        assert.deepEqual(r.paths, [path.join(SAMPLE_DIR, "a.ts"), path.join(SAMPLE_DIR, "b.ts"), path.join(SAMPLE_DIR, "dest") + path.sep])
    })

    it("accepts --dry-run under move", () => {
        const r = parseArgs(["move", "a.ts", "dest", "--dry-run", "-p", SAMPLE_TSCONFIG])
        assert.ok(r && !("help" in r))
        assert.equal(r.dryRun, true)
    })

    it("rejects move with fewer than two positionals", () => {
        const r = quiet(() => parseArgs(["move", "only-one.ts", "-p", SAMPLE_TSCONFIG]))
        assert.equal(r, undefined)
    })

    // Global options (-p / --project, --dry-run) may sit on either side of
    // the subcommand; the three duplicate shapes behave identically.
    it("accepts -p before the subcommand (global, left side)", () => {
        const r = parseArgs(["-p", SAMPLE_TSCONFIG, "report"])
        assert.ok(r && !("help" in r))
        assert.equal(r.command, "report")
        assert.equal(r.tsconfigPath, SAMPLE_TSCONFIG)
    })

    it("accepts --project before the subcommand for any command", () => {
        const r = parseArgs(["--project", SAMPLE_TSCONFIG, "format", "--semicolons", "off"])
        assert.ok(r && !("help" in r))
        assert.equal(r.command, "format")
        assert.equal(r.tsconfigPath, SAMPLE_TSCONFIG)
        assert.equal(r.applyOverrides.semicolons, "off")
    })

    it("accepts --dry-run before the subcommand (left side)", () => {
        const r = parseArgs(["--dry-run", "format", "-p", SAMPLE_TSCONFIG])
        assert.ok(r && !("help" in r))
        assert.equal(r.command, "format")
        assert.equal(r.dryRun, true)
    })

    it("rejects --dry-run for a read command, wherever it sits", () => {
        assert.equal(quiet(() => parseArgs(["report", "--dry-run", "-p", SAMPLE_TSCONFIG])), undefined)
        assert.equal(quiet(() => parseArgs(["--dry-run", "report", "-p", SAMPLE_TSCONFIG])), undefined)
    })

    it("rejects -p duplicated across either side, like the right-side duplicate", () => {
        // left+right
        assert.equal(quiet(() => parseArgs(["-p", SAMPLE_TSCONFIG, "report", "-p", SAMPLE_TSCONFIG])), undefined)
        // left+left
        assert.equal(quiet(() => parseArgs(["-p", SAMPLE_TSCONFIG, "-p", SAMPLE_TSCONFIG, "report"])), undefined)
        // right+right
        assert.equal(quiet(() => parseArgs(["report", "-p", SAMPLE_TSCONFIG, "-p", SAMPLE_TSCONFIG])), undefined)
    })

    it("treats globals with no subcommand as a usage error, not help", () => {
        assert.equal(quiet(() => parseArgs(["-p", SAMPLE_TSCONFIG])), undefined)
        assert.equal(quiet(() => parseArgs(["--dry-run"])), undefined)
    })
})
