import {strict as assert} from "node:assert"
import path from "node:path"
import {describe, it} from "node:test"
import {parseMove} from "./move-args.ts"

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

describe("parseMove", () => {
    it("keeps positionals raw as a flat list (resolve + split happen in the runner)", () => {
        const r = parseMove(["a.ts", "b.ts", "dest/"], G)
        assert.ok(r)
        // Trailing `/` is preserved verbatim so the runner can detect a directory dest.
        assert.deepEqual(r.paths, ["a.ts", "b.ts", "dest/"])
    })

    it("passes the dry-run flag through from the globals", () => {
        const r = parseMove(["a.ts", "dest"], {tsconfigPath: SAMPLE_TSCONFIG, dryRun: true})
        assert.ok(r)
        assert.equal(r.dryRun, true)
    })

    it("rejects fewer than two positionals", () => {
        assert.equal(
            quiet(() => parseMove(["only-one.ts"], G)),
            undefined,
        )
    })
})
