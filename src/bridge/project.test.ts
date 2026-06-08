import {strict as assert} from "node:assert"
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import {after, describe, it} from "node:test"
import {initBridgeTestProject} from "../test-utils/init-test-project.ts"
import {normalizePath} from "./file-system.ts"
import {Project} from "./project.ts"

describe("Project", () => {
    const tempDirs: string[] = []

    after(async () => {
        await Promise.all(tempDirs.map((dir) => fs.rm(dir, {recursive: true, force: true})))
    })

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

    it("uses the tsconfig directory as the language-service current directory", async () => {
        const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ts-refine-project-"))
        tempDirs.push(dir)
        await fs.writeFile(path.join(dir, "tsconfig.json"), JSON.stringify({files: ["main.ts"], compilerOptions: {strict: true}}))
        await fs.writeFile(path.join(dir, "main.ts"), "export const value = 1\n")

        const project = new Project({tsConfigFilePath: path.join(dir, "tsconfig.json"), skipLoadingLibFiles: true})

        assert.equal(project.getCurrentDirectory(), normalizePath(dir))
    })
})
