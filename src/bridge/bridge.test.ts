import {strict as assert} from "node:assert"
import {describe, it} from "node:test"
import type {ProjectOptions, SourceFile, Symbol} from "./bridge.ts"
import {Node, Project} from "./bridge.ts"

describe("bridge entry point", () => {
    it("exports the private wrapper surface without re-exporting TypeScript APIs", () => {
        const opts: ProjectOptions = {compilerOptions: {noLib: true}, useInMemoryFileSystem: true}
        const project = new Project(opts)
        const sourceFile: SourceFile = project.createSourceFile("/entry.ts", "export const value = 1\n")
        const variable = sourceFile.getVariableStatements()[0]
        const symbol: Symbol | undefined = variable.getDeclarations()[0]?.getSymbol()

        assert.ok(project instanceof Project)
        assert.ok(variable instanceof Node)
        assert.equal(sourceFile.getFullText(), "export const value = 1\n")
        assert.ok(symbol)
    })
})
