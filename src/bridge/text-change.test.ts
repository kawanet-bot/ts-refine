import {strict as assert} from "node:assert"
import {describe, it} from "node:test"
import type {CombinedCodeActions as TsCombinedCodeActions, FileTextChanges as TsFileTextChanges} from "typescript"
import {Project} from "./project.ts"
import {CombinedCodeActions, FileTextChanges, applyTextChanges} from "./text-change.ts"

describe("text-change wrappers", () => {
    it("applies text changes from later spans to earlier spans", () => {
        const text = applyTextChanges("abcde", [
            {newText: "D", span: {length: 1, start: 3}},
            {newText: "B", span: {length: 1, start: 1}},
        ])

        assert.equal(text, "aBcDe")
    })

    it("applies file changes and combined code actions to bridge source files", () => {
        const project = new Project({useInMemoryFileSystem: true})
        const main = project.createSourceFile("/main.ts", "const value = 1\n")
        const fileChange: TsFileTextChanges = {
            fileName: "/main.ts",
            textChanges: [{newText: "renamed", span: {length: "value".length, start: "const ".length}}],
        }

        const wrapped = new FileTextChanges(project, fileChange)

        assert.equal(wrapped.getFilePath(), "/main.ts")
        assert.deepEqual(wrapped.getTextChanges(), fileChange.textChanges)

        wrapped.applyChanges()

        assert.equal(main.getFullText(), "const renamed = 1\n")

        const actions = new CombinedCodeActions(project, {
            changes: [
                {
                    fileName: "/main.ts",
                    textChanges: [{newText: "2", span: {length: 1, start: "const renamed = ".length}}],
                },
            ],
        } as TsCombinedCodeActions)

        actions.applyChanges()

        assert.equal(main.getFullText(), "const renamed = 2\n")
    })
})
