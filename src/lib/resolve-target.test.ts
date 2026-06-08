import {strict as assert} from "node:assert"
import {before, describe, it} from "node:test"
import type {Project} from "../bridge/bridge.ts"
import {initInMemoryProject} from "../common/init-project.ts"
import {resolveInProjectAnchors} from "./resolve-target.ts"
import {inProjectSourceFileOrThrow, inProjectSourceFiles} from "./source-files.ts"

describe("resolve-target external-library exclusion", () => {
    let project: Project
    let dts: string

    before(() => {
        dts = "/node_modules/external-lib/index.d.ts"
        project = initInMemoryProject()
        project.createSourceFile("/src.ts", "export const local = 1\n")
        project.createSourceFile(dts, "export interface ExternalOnly { value: string }\n")
    })

    it("loads the external .d.ts but treats it as out of project", () => {
        const added = project.getSourceFileOrThrow(dts)
        assert.equal(added.isFromExternalLibrary(), true)

        // The raw program sees it; the in-project view filters it out.
        assert.ok(project.getSourceFiles().includes(added))
        assert.ok(!inProjectSourceFiles(project).includes(added))
    })

    it("yields no in-project anchor for a name only an external dependency exports", () => {
        // The bridge intentionally treats dependency declarations as load-only:
        // they can satisfy imports, but they cannot become rename/list anchors.
        assert.deepEqual(resolveInProjectAnchors(project, "ExternalOnly", null), [])
    })

    it("rejects a file scope that points at an external-library file", () => {
        assert.throws(() => resolveInProjectAnchors(project, "ExternalOnly", dts), /not in the project/)
        assert.throws(() => inProjectSourceFileOrThrow(project, dts), /not in the project/)
    })

    it("rejects a file scope that is not in the project at all", () => {
        assert.throws(() => inProjectSourceFileOrThrow(project, "/no/such/file.ts"), /not in the project/)
    })
})
