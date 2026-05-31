import {strict as assert} from "node:assert"
import path from "node:path"
import {describe, it} from "node:test"
import {parseInspect} from "./inspect-args.ts"

const SAMPLE_TSCONFIG = path.resolve(import.meta.dirname, "../../../sample/basic/tsconfig.json")
const G = {tsconfigPath: SAMPLE_TSCONFIG, dryRun: false}

describe("parseInspect", () => {
    it("defaults to the full inspector registry", () => {
        const r = parseInspect([], G)
        assert.ok(r)
        assert.deepEqual(r.inspectorNames, ["exports", "importers"])
    })

    it("collects inspector selectors and dedupes", () => {
        const r = parseInspect(["--exports", "--importers", "--exports"], G)
        assert.ok(r)
        assert.deepEqual(r.inspectorNames, ["exports", "importers"])
    })

    it("passes unknown inspector selectors through (refineInspect validates)", () => {
        const r = parseInspect(["--typo"], G)
        assert.ok(r)
        assert.deepEqual(r.inspectorNames, ["typo"])
    })

    it("keeps positional files raw for the runner to resolve", () => {
        const r = parseInspect(["a.ts"], G)
        assert.ok(r)
        assert.deepEqual(r.paths, ["a.ts"])
    })
})
