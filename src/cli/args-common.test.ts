// Shared CLI grammar: help, the position-independent globals, subcommand
// errors, and tsconfig/path resolution. Per-command option parsing is covered
// in src/cli/<command>/<command>-args.test.ts.

import {strict as assert} from "node:assert"
import path from "node:path"
import {describe, it} from "node:test"
import {resolvePaths} from "./args-common.ts"
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

describe("parseArgs help", () => {
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
})

describe("parseArgs globals (position-independent)", () => {
    // Global options (-p / --project, --dry-run) may sit on either side of
    // the subcommand. parseArgs returns the chosen command, the raw globals,
    // and the still-unparsed tokens to its right.
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

    it("accepts -p before the subcommand (global, left side)", () => {
        const r = parseArgs(["-p", SAMPLE_TSCONFIG, "report"])
        assert.ok(r && !("help" in r))
        assert.equal(r.command, "report")
        assert.equal(r.tsconfigPath, SAMPLE_TSCONFIG)
    })

    it("leaves the command's own tokens in `rest` regardless of global position", () => {
        const r = parseArgs(["--project", SAMPLE_TSCONFIG, "format", "--semicolons", "off"])
        assert.ok(r && !("help" in r))
        assert.equal(r.command, "format")
        assert.equal(r.tsconfigPath, SAMPLE_TSCONFIG)
        assert.deepEqual(r.rest, ["--semicolons", "off"])
    })

    it("accepts --dry-run before the subcommand (left side)", () => {
        const r = parseArgs(["--dry-run", "format", "-p", SAMPLE_TSCONFIG])
        assert.ok(r && !("help" in r))
        assert.equal(r.command, "format")
        assert.equal(r.dryRun, true)
    })

    it("rejects -p duplicated across either side, like the right-side duplicate", () => {
        // left+right
        assert.equal(
            quiet(() => parseArgs(["-p", SAMPLE_TSCONFIG, "report", "-p", SAMPLE_TSCONFIG])),
            undefined,
        )
        // left+left
        assert.equal(
            quiet(() => parseArgs(["-p", SAMPLE_TSCONFIG, "-p", SAMPLE_TSCONFIG, "report"])),
            undefined,
        )
        // right+right
        assert.equal(
            quiet(() => parseArgs(["report", "-p", SAMPLE_TSCONFIG, "-p", SAMPLE_TSCONFIG])),
            undefined,
        )
    })
})

describe("parseArgs subcommand handling", () => {
    it("passes an unrecognized subcommand through verbatim (validity is the table's job)", () => {
        const r = parseArgs(["frobnicate", "-p", SAMPLE_TSCONFIG])
        assert.ok(r && !("help" in r))
        assert.equal(r.command, "frobnicate")
    })

    it("treats a leading-dash token where the subcommand belongs as the command verbatim", () => {
        // refineCLI turns this into an "expected a subcommand" error.
        const r = parseArgs(["--output", "prettier", "-p", SAMPLE_TSCONFIG])
        assert.ok(r && !("help" in r))
        assert.equal(r.command, "--output")
        assert.deepEqual(r.rest, ["prettier"])
    })

    it("treats globals with no subcommand as a usage error, not help", () => {
        assert.equal(
            quiet(() => parseArgs(["-p", SAMPLE_TSCONFIG])),
            undefined,
        )
        assert.equal(
            quiet(() => parseArgs(["--dry-run"])),
            undefined,
        )
    })
})

describe("resolvePaths", () => {
    it("defaults to ./tsconfig.json when no path is given", () => {
        assert.equal(resolvePaths(null, []).absTsconfig, path.resolve("tsconfig.json"))
    })

    it("treats a non-.json value as a directory and appends tsconfig.json", () => {
        assert.equal(resolvePaths(SAMPLE_DIR, []).absTsconfig, path.join(SAMPLE_DIR, "tsconfig.json"))
    })

    it("treats `.` the same as omitting the path", () => {
        assert.equal(resolvePaths(".", []).absTsconfig, path.resolve("tsconfig.json"))
    })

    it("resolves positional file globs against the tsconfig directory", () => {
        const {paths} = resolvePaths(SAMPLE_TSCONFIG, ["src/**", "extra.ts"])
        assert.deepEqual(paths, [path.join(SAMPLE_DIR, "src/**"), path.join(SAMPLE_DIR, "extra.ts")])
    })
})
