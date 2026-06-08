import {strict as assert} from "node:assert"
import {describe, it} from "node:test"
import {ScriptKind, SyntaxKind} from "typescript"
import {initBridgeTestProject} from "../test-utils/init-test-project.ts"

describe("SourceFile", () => {
    it("parses and exposes the declaration families used by ts-refine", () => {
        const project = initBridgeTestProject()
        const sourceFile = project.createSourceFile(
            "/src/sample.ts",
            [
                'import {value} from "./dep.ts"',
                'export {value} from "./dep.ts"',
                "export function fn() { return value }",
                "export class Box { method() {} }",
                "export interface Shape { width: number }",
                "export type Alias = string",
                "export enum Kind { A }",
                "export namespace NS { export const nested = 1 }",
                "const local = value",
                "",
            ].join("\n"),
        )

        assert.equal(sourceFile.getDirectoryPath(), "/src")
        assert.equal(sourceFile.getBaseName(), "sample.ts")
        assert.equal(sourceFile.getScriptKind(), ScriptKind.TS)
        assert.equal(sourceFile.getImportDeclarations().length, 1)
        assert.equal(sourceFile.getExportDeclarations().length, 1)
        assert.equal(sourceFile.getFunctions()[0]?.getName(), "fn")
        assert.equal(sourceFile.getClasses()[0]?.getMembers().length, 1)
        assert.equal(sourceFile.getInterfaces()[0]?.getName(), "Shape")
        assert.equal(sourceFile.getTypeAliases()[0]?.getName(), "Alias")
        assert.equal(sourceFile.getEnums()[0]?.getName(), "Kind")
        assert.equal(sourceFile.getModules()[0]?.getName(), "NS")
        assert.equal(sourceFile.getVariableStatements()[0]?.getDeclarationKind(), "const")
        assert.equal(sourceFile.getDescendantsOfKind(SyntaxKind.StringLiteral)[0]?.getLiteralValue(), "./dep.ts")
        assert.deepEqual(sourceFile.getLineAndColumnAtPos(sourceFile.getFullText().indexOf("class")), {line: 4, column: 8})
    })

    it("moves a file while rewriting incoming and outgoing module specifiers", () => {
        const project = initBridgeTestProject()
        project.createSourceFile("/src/dep.ts", "export const value = 1\n")
        const moved = project.createSourceFile("/src/moved.ts", 'import {value} from "./dep.ts"\nexport const result = value\n')
        const main = project.createSourceFile("/src/main.ts", 'import {result} from "./moved.ts"\nconst used = result\n')

        moved.move("/src/sub/moved.ts")

        assert.equal(moved.getFilePath(), "/src/sub/moved.ts")
        assert.equal(project.getSourceFile("/src/moved.ts"), undefined)
        assert.equal(project.getSourceFileOrThrow("/src/sub/moved.ts"), moved)
        assert.equal(moved.getFullText(), 'import {value} from "../dep.ts"\nexport const result = value\n')
        assert.equal(main.getFullText(), 'import {result} from "./sub/moved.ts"\nconst used = result\n')
    })

    it("moves a file while rewriting import-equals require specifiers", () => {
        const project = initBridgeTestProject()
        project.createSourceFile("/src/dep.ts", "export const value = 1\n")
        const moved = project.createSourceFile("/src/moved.ts", 'import dep = require("./dep.ts")\nexport const result = dep.value\n')
        const main = project.createSourceFile("/src/main.ts", 'import moved = require("./moved.ts")\nconst used = moved.result\n')

        moved.move("/src/sub/moved.ts")

        assert.equal(moved.getFullText(), 'import dep = require("../dep.ts")\nexport const result = dep.value\n')
        assert.equal(main.getFullText(), 'import moved = require("./sub/moved.ts")\nconst used = moved.result\n')
    })
})
