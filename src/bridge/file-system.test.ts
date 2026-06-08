import {strict as assert} from "node:assert"
import {describe, it} from "node:test"
import {BridgeFileSystem, normalizePath} from "./file-system.ts"

describe("BridgeFileSystem", () => {
    it("reads, writes, lists, and deletes files from the in-memory backing map", async () => {
        const files = new Map<string, string>()
        const fileSystem = new BridgeFileSystem(files)
        const filePath = "/tmp/bridge/src/file.ts"

        fileSystem.writeFileSync(filePath, "export const value = 1\n")

        assert.equal(fileSystem.fileExistsSync(filePath), true)
        assert.equal(fileSystem.directoryExistsSync("/tmp/bridge/src"), true)
        assert.equal(fileSystem.readFileSync(filePath), "export const value = 1\n")
        assert.equal(files.get(normalizePath(filePath)), "export const value = 1\n")

        await fileSystem.delete(filePath)

        assert.equal(fileSystem.fileExistsSync(filePath), false)
    })
})
