import {strict as assert} from "node:assert"
import {describe, it} from "node:test"
import {versionText} from "./version.ts"

describe("versionText", () => {
    it("reports the ts-refine and typescript versions, one per line", () => {
        const [first, second] = versionText().split("\n")
        assert.match(first, /^ts-refine \d+\.\d+\.\d+/)
        assert.match(second, /^typescript \d+\.\d+\.\d+/)
    })
})
