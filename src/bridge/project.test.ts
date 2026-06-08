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

describe("Project", () => {
    it("creates, finds, globs, resolves, and versions in-memory source files", () => {
        const project = newProject()
        const dep = project.createSourceFile("/src/dep.ts", "export const value = 1\n")
        const main = project.createSourceFile("/src/main.ts", 'import {value} from "./dep.ts"\nconst used = value\n')
        const beforeVersion = project.getScriptVersion("/src/main.ts")

        main.replaceWithText('import {value} from "./dep.ts"\nconst used = value + 1\n')

        assert.equal(project.getSourceFileOrThrow("/src/dep.ts"), dep)
        assert.deepEqual(
            project
                .getSourceFiles(["/src/*.ts"])
                .map((sf) => sf.getBaseName())
                .sort(),
            ["dep.ts", "main.ts"],
        )
        assert.equal(project.resolveModuleSpecifier(main, "./dep.ts"), dep)
        assert.notEqual(project.getScriptVersion("/src/main.ts"), beforeVersion)
    })
})
