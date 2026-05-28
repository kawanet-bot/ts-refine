import {strict as assert} from "node:assert"
import {spawnSync} from "node:child_process"
import path from "node:path"
import {describe, it} from "node:test"

const CLI = path.resolve(import.meta.dirname, "./cli.ts")

describe("cli", () => {
    it("prints usage when --help is given", () => {
        const r = spawnSync(process.execPath, [CLI, "--help"], {encoding: "utf8"})
        assert.equal(r.status, 0)
        assert.match(r.stdout, /Usage: ts-survey/)
        assert.match(r.stdout, /--apply/)
        assert.match(r.stdout, /--report/)
        assert.match(r.stdout, /--organize-imports on\|off/)
    })
})
