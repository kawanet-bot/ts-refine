import {strict as assert} from "node:assert"
import path from "node:path"
import {describe, it} from "node:test"
import {parseArgs} from "./parse-args.ts"

const SAMPLE_TSCONFIG = path.resolve(import.meta.dirname, "../../sample/basic/tsconfig.json")
const KNOWN = ["unused-exports", "semicolons"]

describe("parseArgs", () => {
    it("recognises --organize-imports as a write action", async () => {
        const r = await parseArgs(["--organize-imports", SAMPLE_TSCONFIG], {reportNames: KNOWN})
        assert.equal(r.organizeImports, true)
        assert.equal(r.removeSemicolons, false)
        assert.equal(r.reportNames.length, 0)
    })

    it("accepts comma-separated --report names with de-duplication", async () => {
        const r = await parseArgs(["--report", "unused-exports,semicolons,unused-exports", SAMPLE_TSCONFIG], {reportNames: KNOWN})
        assert.deepEqual(r.reportNames, ["unused-exports", "semicolons"])
    })

    it("accepts repeated --report flags", async () => {
        const r = await parseArgs(["--report", "unused-exports", "--report", "semicolons", SAMPLE_TSCONFIG], {reportNames: KNOWN})
        assert.deepEqual(r.reportNames, ["unused-exports", "semicolons"])
    })

    it("resolves include/exclude globs against the tsconfig directory", async () => {
        const r = await parseArgs(["--organize-imports", SAMPLE_TSCONFIG, "--include", "src/**", "--exclude", "**/*.cli.ts"], {reportNames: KNOWN})
        const dir = path.dirname(SAMPLE_TSCONFIG)
        assert.equal(r.absIncludes[0], path.join(dir, "src/**"))
        assert.equal(r.absExcludes[0], path.join(dir, "**/*.cli.ts"))
    })
})
