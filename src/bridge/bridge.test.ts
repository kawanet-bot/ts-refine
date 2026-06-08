import {strict as assert} from "node:assert"
import {describe, it} from "node:test"
import {Node, Project} from "./bridge.ts"

describe("bridge entry point", () => {
    it("exports the runtime wrapper surface used by bridge consumers", () => {
        const project = new Project({compilerOptions: {noLib: true}, useInMemoryFileSystem: true})
        const sourceFile = project.createSourceFile("/entry.ts", "export const value = 1\n")
        const variable = sourceFile.getVariableStatements()[0]

        assert.ok(project instanceof Project)
        assert.ok(variable instanceof Node)
        assert.equal(sourceFile.getFullText(), "export const value = 1\n")
    })
})
