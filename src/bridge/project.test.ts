import {strict as assert} from "node:assert"
import {describe, it} from "node:test"
import {initBridgeTestProject} from "../test-utils/init-test-project.ts"
import {Project} from "./project.ts"

describe("Project", () => {
    it("creates, finds, globs, resolves, and versions in-memory source files", () => {
        const project = initBridgeTestProject()
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

    it("keeps in-memory projects hermetic from host filesystem reads", () => {
        const project = new Project({useInMemoryFileSystem: true})

        assert.equal(project.fileExists("package.json"), false)
        assert.equal(project.readFileText("package.json"), "")
    })
})
