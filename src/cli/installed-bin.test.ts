// Exercises the `ts-refine` bin as a consumer sees it: CI matrix lanes run
// the bundled suites right after `npm install <tarball>`, where the bin
// must be linked and answer. Source runs have no self-install, so skip.
import {strict as assert} from "node:assert"
import {execFileSync} from "node:child_process"
import {existsSync} from "node:fs"
import path from "node:path"
import {describe, it} from "node:test"

const BIN = path.resolve("node_modules/.bin/ts-refine")

describe("installed bin", {skip: !existsSync(BIN)}, () => {
    it("responds to --help with usage", () => {
        const out = execFileSync(BIN, ["--help"], {encoding: "utf8"})
        assert.match(out, /^Usage: ts-refine /)
    })
})
