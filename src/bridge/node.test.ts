import {strict as assert} from "node:assert"
import {describe, it} from "node:test"
import {initBridgeTestProject} from "../test-utils/init-test-project.ts"
import {Node} from "./node.ts"

describe("Node", () => {
    it("exposes the import helpers used by import rewriting", () => {
        const project = initBridgeTestProject()
        project.createSourceFile("/dep.ts", "export default 1\nexport const value = 2\n")
        const main = project.createSourceFile("/main.ts", 'import def, {value as local} from "./dep.ts"\nconst used = def + local\n')
        const importDecl = main.getImportDeclarations()[0]
        const named = importDecl?.getNamedImports()[0]

        assert.ok(Node.isImportDeclaration(importDecl))
        assert.equal(importDecl.getModuleSpecifierValue(), "./dep.ts")
        assert.equal(importDecl.getModuleSpecifierSourceFile()?.getFilePath(), "/dep.ts")
        assert.equal(importDecl.getDefaultImport()?.getText(), "def")
        assert.equal(named?.getName(), "value")
        assert.equal(named?.getNameNode()?.getText(), "value")
        assert.equal(named?.getAliasNode()?.getText(), "local")

        importDecl.setModuleSpecifier("./other.ts")

        assert.equal(main.getFullText(), 'import def, {value as local} from "./other.ts"\nconst used = def + local\n')
    })

    it("separates imported names from local aliases on export specifiers", () => {
        const project = initBridgeTestProject()
        project.createSourceFile("/dep.ts", "export const value = 2\n")
        const main = project.createSourceFile("/main.ts", 'export {value as local} from "./dep.ts"\n')
        const named = main.getExportDeclarations()[0]?.getNamedExports()[0]

        assert.equal(named?.getName(), "value")
        assert.equal(named?.getNameNode()?.getText(), "value")
        assert.equal(named?.getAliasNode()?.getText(), "local")
    })

    it("renames a reference-findable declaration across project files", () => {
        const project = initBridgeTestProject()
        const dep = project.createSourceFile("/dep.ts", "export function oldName() { return 1 }\n")
        const main = project.createSourceFile("/main.ts", 'import {oldName} from "./dep.ts"\nconst used = oldName()\n')
        const functionName = dep.getFunctions()[0]?.getNameNodeOrThrow()

        assert.ok(functionName)
        assert.equal(Node.isReferenceFindable(functionName), true)
        assert.ok(functionName.findReferencesAsNodes().length >= 3)

        functionName.rename("newName")

        assert.equal(dep.getFullText(), "export function newName() { return 1 }\n")
        assert.equal(main.getFullText(), 'import {newName} from "./dep.ts"\nconst used = newName()\n')
    })
})
