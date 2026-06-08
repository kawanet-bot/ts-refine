import {strict as assert} from "node:assert"
import path from "node:path"
import {describe, it} from "node:test"
import {createRefineProject, initInMemoryProject, resolveProject} from "./init-project.ts"

const SAMPLE_TSCONFIG = path.resolve(import.meta.dirname, "../../sample/basic/tsconfig.json")

describe("resolveProject", () => {
    it("creates a public project for bring-your-own-project calls", () => {
        const project = createRefineProject({useInMemoryFileSystem: true})
        const sf = project.createSourceFile("/main.ts", "export const value = 1\n")

        assert.equal(project.getSourceFile("/main.ts"), sf)
        assert.equal(sf.getFullText(), "export const value = 1\n")
    })

    it("returns the caller-supplied project (bring-your-own)", () => {
        const project = initInMemoryProject()
        assert.equal(resolveProject({project}), project)
    })

    it("builds a project from tsConfigFilePath", () => {
        const project = resolveProject({tsConfigFilePath: SAMPLE_TSCONFIG})
        assert.ok(project.getSourceFiles().length > 0)
    })

    it("throws when both are given", () => {
        const project = initInMemoryProject()
        assert.throws(() => resolveProject({project, tsConfigFilePath: SAMPLE_TSCONFIG}), /not both/)
    })

    it("throws when neither is given", () => {
        assert.throws(() => resolveProject({}), /project.*tsConfigFilePath/)
    })
})
