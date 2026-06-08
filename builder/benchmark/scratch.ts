// Fresh in-memory copies of the project sources, shared by both sections.
// Production always processes files cold (parsed once, passes applied once),
// so the benchmark rebuilds the SourceFiles for every measured run rather than
// reusing a warmed AST — measuring a cached state would not reflect real use.

import type {SourceFile} from "../../src/bridge/bridge.ts"
import {initInMemoryProject} from "../../src/common/init-project.ts"

export interface Fixture {
    path: string
    text: string
}

// A fresh project per call: each run starts from the original text with no
// cached parse/wrappers carried over from a previous run.
export function createScratchFiles(fixtures: ReadonlyArray<Fixture>): SourceFile[] {
    const project = initInMemoryProject()
    return fixtures.map(({path, text}) => project.createSourceFile(path, text, {overwrite: true}))
}
