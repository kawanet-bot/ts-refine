import {strict as assert} from "node:assert"
import {describe, it} from "node:test"
import {ModuleKind, ModuleResolutionKind} from "typescript"
import {Project} from "./project.ts"

function newProject(): Project {
    return new Project({
        compilerOptions: {
            allowImportingTsExtensions: true,
            module: ModuleKind.ESNext,
            moduleResolution: ModuleResolutionKind.Bundler,
        },
        useInMemoryFileSystem: true,
    })
}

describe("Symbol", () => {
    it("resolves declarations, namespace exports, interface members, and import aliases", () => {
        const project = newProject()
        const dep = project.createSourceFile(
            "/dep.ts",
            ["export const value = 1", "export interface Shape { width: number }", "export namespace NS { export interface Box { height: number } }", ""].join("\n"),
        )
        const main = project.createSourceFile("/main.ts", 'import {value as alias} from "./dep.ts"\nconst used = alias\n')
        const namespaceSymbol = dep.getModules()[0]?.getSymbol()
        const shapeSymbol = dep.getInterfaces()[0]?.getSymbol()
        const aliasSymbol = main.getImportDeclarations()[0]?.getNamedImports()[0]?.getNameNodeOrThrow().getSymbol()

        assert.equal(namespaceSymbol?.getExport("Box")?.getDeclarations()[0]?.getName(), "Box")
        assert.equal(shapeSymbol?.getMember("width")?.getDeclarations()[0]?.getName(), "width")
        assert.equal(aliasSymbol?.getAliasedSymbol()?.getDeclarations()[0]?.getVariableStatement()?.getDeclarations()[0]?.getName(), "value")
    })
})
