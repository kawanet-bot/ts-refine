import {strict as assert} from "node:assert"
import path from "node:path"
import {describe, it} from "node:test"
import {parseRename} from "./rename-args.ts"

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

describe("parseRename", () => {
    it("parses --from / --to as a project-wide rename (no scope file)", () => {
        const r = parseRename(["--from", "funcA", "--to", "funcB"], G)
        assert.ok(r)
        assert.equal(r.from, "funcA")
        assert.equal(r.to, "funcB")
        assert.deepEqual(r.paths, [])
        assert.equal(r.dryRun, false)
    })

    it("keeps the scope file raw for the runner to resolve", () => {
        const r = parseRename(["libs.ts", "--from", "funcA", "--to", "funcB"], G)
        assert.ok(r)
        assert.deepEqual(r.paths, ["libs.ts"])
    })

    it("passes the dry-run flag through from the globals", () => {
        const r = parseRename(["--from", "funcA", "--to", "funcB"], {tsconfigPath: SAMPLE_TSCONFIG, dryRun: true})
        assert.ok(r)
        assert.equal(r.dryRun, true)
    })

    it("errors when --to is missing", () => {
        assert.equal(
            quiet(() => parseRename(["--from", "funcA"], G)),
            undefined,
        )
    })

    it("errors when more than one file is given", () => {
        assert.equal(
            quiet(() => parseRename(["a.ts", "b.ts", "--from", "funcA", "--to", "funcB"], G)),
            undefined,
        )
    })
})
