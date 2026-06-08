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

describe("LanguageService", () => {
    it("wraps rename locations and formatting edits from the TypeScript language service", () => {
        const project = newProject()
        const dep = project.createSourceFile("/dep.ts", "export const value = 1\n")
        project.createSourceFile("/main.ts", 'import {value} from "./dep.ts"\nconst used = value\n')
        const nameNode = dep.getVariableStatements()[0]?.getDeclarations()[0]?.getNameNodeOrThrow()

        assert.ok(nameNode)

        const locations = project.getLanguageService().findRenameLocations(nameNode)
        const first = locations[0]
        const messy = project.createSourceFile("/messy.ts", "export function fn(){return 1}\n")
        const edits = project.getLanguageService().getFormattingEditsForDocument(messy, {indentSize: 2, tabSize: 2})

        assert.ok(locations.length >= 3)
        assert.equal(first.getSourceFile().getFilePath(), "/dep.ts")
        assert.equal(first.getTextSpan().getEnd() - first.getTextSpan().getStart(), "value".length)
        assert.ok(edits.length > 0)
    })

    it("returns applicable organize-imports changes as bridge file changes", () => {
        const project = newProject()
        project.createSourceFile("/dep.ts", "export const a = 1\nexport const b = 2\n")
        const main = project.createSourceFile("/main.ts", 'import {b, a} from "./dep.ts"\nconst used = a + b\n')

        const changes = project.getLanguageService().organizeImports(main)

        assert.ok(changes.length > 0)
        assert.equal(changes[0]?.getFilePath(), "/main.ts")

        changes[0]?.applyChanges()

        assert.equal(main.getFullText(), 'import { a, b } from "./dep.ts"\nconst used = a + b\n')
    })
})
